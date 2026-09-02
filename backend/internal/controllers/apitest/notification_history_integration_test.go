//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type historyPage struct {
	Items []struct {
		ID         string  `json:"id"`
		Type       string  `json:"type"`
		Status     string  `json:"status"`
		Channel    *string `json:"channel"`
		EventTitle *string `json:"event_title"`
		Preview    *string `json:"preview"`
		Redacted   bool    `json:"redacted"`
	} `json:"items"`
	Meta struct {
		Total int64 `json:"total"`
	} `json:"meta"`
}

func notificationHistory(c *support.Client, t *testing.T) historyPage {
	t.Helper()
	resp := c.Get("/me/notifications")
	support.RequireStatus(t, resp, http.StatusOK, "reading the notification history")

	var page historyPage
	resp.Decode(t, &page)
	return page
}

func TestNotificationHistoryShowsOnlyOwnNotifications(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	if _, err := s.DB().Pool().Exec(t.Context(), `
		UPDATE notifications SET status = 'SENT', sent_at = now()
		WHERE recipient_user_id = (SELECT id FROM users WHERE display_id = $1)`, f.Member.ID); err != nil {
		t.Fatalf("marking notifications sent: %v", err)
	}

	owner := s.Session(t, f.Member)
	page := notificationHistory(owner, t)
	if page.Meta.Total == 0 {
		t.Fatal("the recipient sees no notifications of their own")
	}

	outsider := s.Session(t, f.Outsider)
	foreign := notificationHistory(outsider, t)
	if foreign.Meta.Total != 0 {
		t.Fatalf("an unrelated user sees %d notifications addressed to someone else",
			foreign.Meta.Total)
	}

	admin := s.Session(t, f.Admin)
	adminPage := notificationHistory(admin, t)
	if adminPage.Meta.Total != 0 {
		t.Fatalf("the administrator sees %d notifications of another recipient: "+
			"the history is scoped by recipient, not by role", adminPage.Meta.Total)
	}
}

func TestNotificationHistorySurvivesThePayloadPurge(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	owner := s.Session(t, f.Member)
	before := notificationHistory(owner, t)
	if before.Meta.Total == 0 {
		t.Fatal("no notification to purge")
	}
	if before.Items[0].Preview == nil {
		t.Fatal("a fresh notification carries no preview")
	}
	if before.Items[0].Redacted {
		t.Fatal("a fresh notification is reported as redacted")
	}

	if _, err := s.DB().Pool().Exec(t.Context(), `
		UPDATE notifications SET payload_json = NULL WHERE recipient_user_id = (SELECT id FROM users WHERE display_id = $1)`,
		f.Member.ID); err != nil {
		t.Fatalf("clearing the payload: %v", err)
	}

	after := notificationHistory(owner, t)
	if after.Meta.Total != before.Meta.Total {
		t.Fatalf("clearing the payload changed the row count from %d to %d: "+
			"specification 4 keeps the row and clears only the payload",
			before.Meta.Total, after.Meta.Total)
	}
	item := after.Items[0]
	if item.Preview != nil {
		t.Fatalf("a purged notification still returns a preview: %q", *item.Preview)
	}
	if !item.Redacted {
		t.Fatal("a purged notification is not marked redacted, so the screen cannot explain the gap")
	}
	if item.Type == "" || item.Status == "" {
		t.Fatal("a purged notification lost its type or status, which do not live in the payload")
	}
}

func TestNotificationHistoryNeverReturnsTheWholePayload(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	owner := s.Session(t, f.Member)
	resp := owner.Get("/me/notifications")
	support.RequireStatus(t, resp, http.StatusOK, "reading the notification history")

	var raw map[string]any
	resp.Decode(t, &raw)
	items, _ := raw["items"].([]any)
	if len(items) == 0 {
		t.Fatal("no notification to inspect")
	}
	first, _ := items[0].(map[string]any)
	for _, field := range []string{"payload", "payload_json", "body", "logical_key",
		"recipient_user_id", "registration_status_id"} {
		if _, present := first[field]; present {
			t.Fatalf("the history exposes %q; specification 117l requires a preview, "+
				"not the payload", field)
		}
	}
}

func TestPrimaryNotificationAtAssignmentUsesTheRecipientLanguage(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	setLocale(s, t, f.Member.ID, "en")

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.OtherEvent+"/registration",
		map[string]any{
			"url":         "https://example.com/other",
			"deadline_at": time.Now().UTC().Add(36 * time.Hour).Format(time.RFC3339),
		}), http.StatusCreated, "creating the second registration")

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Post("/events/"+f.OtherEvent+"/join",
		map[string]any{"team_role": "Developer"}), http.StatusCreated, "joining the open event")

	page := notificationHistory(member, t)
	for _, item := range page.Items {
		if item.EventTitle == nil || *item.EventTitle != "Foreign event" {
			continue
		}
		if item.Preview == nil {
			t.Fatal("the primary notification carries no preview")
		}
		if !strings.HasPrefix(*item.Preview, "Registration required") {
			t.Fatalf("an English recipient received %q: the notification created inside the "+
				"assignment transaction ignored the language in their profile", *item.Preview)
		}
		return
	}
	t.Fatal("joining the event created no primary notification")
}
