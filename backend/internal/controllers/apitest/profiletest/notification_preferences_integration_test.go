//go:build integration

package profiletest_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
	"github.com/GoatWhistle/timeline/internal/models"
)

func requestedChannelsForMember(s *support.Stack, t *testing.T, eventID, userID string) []string {
	t.Helper()
	rows, err := s.DB().Pool().Query(context.Background(), `
		SELECT n.requested_channel FROM notifications n
		JOIN registration_statuses rs ON rs.id = n.registration_status_id
		WHERE rs.event_id = (SELECT id FROM events WHERE display_id = $1)
		  AND n.recipient_user_id = (SELECT id FROM users WHERE display_id = $2)
		  AND n.notification_type = 'REGISTRATION_REQUIRED'`, eventID, userID)
	if err != nil {
		t.Fatalf("querying requested channels: %v", err)
	}
	defer rows.Close()

	var channels []string
	for rows.Next() {
		var channel string
		if err := rows.Scan(&channel); err != nil {
			t.Fatalf("scanning requested channel: %v", err)
		}
		channels = append(channels, channel)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterating requested channels: %v", err)
	}
	return channels
}

func TestMutingOneChannelForAnOccasionStopsExactlyThatDeliveryAndLeavesTheOtherWorking(t *testing.T) {
	s := support.NewStack(t)
	suffix := support.Nickname()
	admin := s.Register(t, "admin-"+suffix+"@example.com")
	s.Promote(t, admin.ID)
	member := s.Register(t, "member-"+suffix+"@example.com")

	memberClient := s.Session(t, member)
	muteResp := memberClient.Mutate(http.MethodPut,
		"/me/notification-preferences/REGISTRATION_REQUIRED/EMAIL", map[string]bool{"enabled": false})
	support.RequireStatus(t, muteResp, http.StatusOK, "muting email for registration-required")

	adminClient := s.Session(t, admin)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	eventID := adminClient.CreateEvent(t, "Mute test event", start)
	adminClient.Publish(t, eventID)
	support.RequireStatus(t, adminClient.Post("/admin/events/"+eventID+"/registration",
		map[string]any{
			"url":         "https://example.com/register",
			"deadline_at": start.Add(12 * time.Hour).Format(time.RFC3339),
		}), http.StatusCreated, "creating the registration")

	memberClient.Join(t, eventID, "Developer")

	channels := requestedChannelsForMember(s, t, eventID, member.ID)
	hasTelegram, hasEmail := false, false
	for _, channel := range channels {
		if channel == "TELEGRAM" {
			hasTelegram = true
		}
		if channel == "EMAIL" {
			hasEmail = true
		}
	}
	if !hasTelegram {
		t.Fatalf("telegram delivery must still happen when only email is muted, got %v", channels)
	}
	if hasEmail {
		t.Fatalf("email delivery must not happen once muted for this occasion, got %v", channels)
	}
}

func TestNotificationPreferencesDefaultToEnabledForAnUntouchedAccount(t *testing.T) {
	s := support.NewStack(t)
	member := s.Register(t, "fresh-"+support.Nickname()+"@example.com")
	client := s.Session(t, member)

	resp := client.Get("/me/notification-preferences")
	support.RequireStatus(t, resp, http.StatusOK, "reading notification preferences")

	var body struct {
		Preferences []struct {
			Occasion string `json:"occasion"`
			Channel  string `json:"channel"`
			Enabled  bool   `json:"enabled"`
		} `json:"preferences"`
	}
	resp.Decode(t, &body)
	want := len(models.AllOccasions) * len(models.AllChannels)
	if len(body.Preferences) != want {
		t.Fatalf("expected every occasion times every channel (%d), got %d", want, len(body.Preferences))
	}
	for _, pref := range body.Preferences {
		if !pref.Enabled {
			t.Fatalf("an untouched account must default to enabled, occasion %s channel %s was off",
				pref.Occasion, pref.Channel)
		}
	}
}
