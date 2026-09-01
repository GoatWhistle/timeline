//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func statusValueOf(s *support.Stack, t *testing.T, eventID, userID string) string {
	t.Helper()
	var value string
	if err := s.DB().Pool().QueryRow(context.Background(), `
		SELECT rs.status FROM registration_statuses rs
		JOIN event_participants p ON p.id = rs.participant_id
		WHERE rs.event_id = (SELECT id FROM events WHERE display_id = $1)
		  AND p.user_id = (SELECT id FROM users WHERE display_id = $2)`,
		eventID, userID).Scan(&value); err != nil {
		t.Fatalf("reading the status of %s on %s: %v", userID, eventID, err)
	}
	return value
}

func statusDisplayID(s *support.Stack, t *testing.T, eventID, userID string) string {
	t.Helper()
	var value string
	if err := s.DB().Pool().QueryRow(context.Background(), `
		SELECT rs.display_id FROM registration_statuses rs
		JOIN event_participants p ON p.id = rs.participant_id
		WHERE rs.event_id = (SELECT id FROM events WHERE display_id = $1)
		  AND p.user_id = (SELECT id FROM users WHERE display_id = $2)`,
		eventID, userID).Scan(&value); err != nil {
		t.Fatalf("resolving the status of %s on %s: %v", userID, eventID, err)
	}
	return value
}

type foreignTeam struct {
	TeamID   string
	LeadID   string
	MemberID string
}

func seedForeignTeamOn(s *support.Stack, t *testing.T, f teamFixture) foreignTeam {
	t.Helper()

	suffix := strings.ReplaceAll(uuid.NewString(), "-", "")[:10]
	otherLead := s.Register(t, "olead-"+suffix+"@example.com")
	otherMate := s.Register(t, "omate-"+suffix+"@example.com")
	otherLeadClient := s.Session(t, otherLead)

	teamID := createTeam(otherLeadClient, t, "Rival crew "+suffix[:6])
	inviteAndAccept(s, otherLeadClient, t, teamID, otherMate)

	assignToEvent(f.AdminClient, t, f.EventID, otherLead.ID)
	assignToEvent(f.AdminClient, t, f.EventID, otherMate.ID)
	enterEvent(otherLeadClient, t, teamID, f.EventID)
	fillRoster(otherLeadClient, t, teamID, f.EventID, otherLead.ID, otherMate.ID)

	return foreignTeam{TeamID: teamID, LeadID: otherLead.ID, MemberID: otherMate.ID}
}

func createMeetup(admin *support.Client, t *testing.T) string {
	t.Helper()
	start := time.Now().UTC().Add(72 * time.Hour).Truncate(time.Second)
	resp := admin.Post("/admin/events", map[string]any{
		"title":    "Evening meetup " + strings.ReplaceAll(uuid.NewString(), "-", "")[:8],
		"kind":     "MEETUP",
		"start_at": start.Format(time.RFC3339),
		"end_at":   start.Add(4 * time.Hour).Format(time.RFC3339),
	})
	support.RequireStatus(t, resp, http.StatusCreated, "creating a meetup")
	var created struct {
		ID string `json:"id"`
	}
	resp.Decode(t, &created)
	admin.Publish(t, created.ID)
	return created.ID
}
