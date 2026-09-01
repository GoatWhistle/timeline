//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type joinedParticipant struct {
	ID                  string  `json:"id"`
	EventID             string  `json:"event_id"`
	TeamRole            *string `json:"team_role"`
	ParticipationStatus string  `json:"participation_status"`
}

func join(c *support.Client, t *testing.T, id string, body map[string]any) support.Response {
	t.Helper()
	return c.Post("/events/"+id+"/join", body)
}

func TestSelfSignupCreatesAnAssignmentWithTheOwnRole(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	joiner := s.Session(t, f.Outsider)
	resp := join(joiner, t, f.EventID, map[string]any{"team_role": "Designer"})
	support.RequireStatus(t, resp, http.StatusCreated, "joining a published event")

	var created joinedParticipant
	resp.Decode(t, &created)
	if created.EventID != f.EventID {
		t.Fatalf("the participant belongs to %s instead of %s", created.EventID, f.EventID)
	}
	if created.ParticipationStatus != "ASSIGNED" {
		t.Fatalf("the participant is %q instead of ASSIGNED", created.ParticipationStatus)
	}
	if created.TeamRole == nil || *created.TeamRole != "Designer" {
		t.Fatalf("the stated role was not stored: %+v", created.TeamRole)
	}

	items := support.Catalog(t, joiner, "page_size=100")
	for _, item := range items {
		if item.ID == f.EventID && !item.Joined {
			t.Fatalf("the catalog does not report the event as joined")
		}
	}

	roster := f.AdminClient.Get("/admin/events/" + f.EventID + "/participants")
	support.RequireStatus(t, roster, http.StatusOK, "listing the roster after a self-signup")
	if !support.ContainsAll(string(roster.Body), f.Outsider.ID, "Designer") {
		t.Fatalf("the self-signed participant is missing from the roster: %s", roster.Body)
	}

	var todo int
	if err := s.DB().Pool().QueryRow(context.Background(), `
		SELECT count(*) FROM registration_statuses rs
		JOIN event_participants p ON p.id = rs.participant_id
		WHERE p.user_id = (SELECT id FROM users WHERE display_id = $1)
			AND rs.status = 'TODO'`, f.Outsider.ID).Scan(&todo); err != nil {
		t.Fatalf("counting the registration statuses: %v", err)
	}
	if todo != 1 {
		t.Fatalf("expected exactly one TODO status after joining, got %d", todo)
	}

	var actor uuid.UUID
	if err := s.DB().Pool().QueryRow(context.Background(), `
		SELECT actor_user_id FROM audit_log
		WHERE entity_type = 'EVENT_PARTICIPANT'
			AND entity_id = (SELECT id FROM event_participants WHERE display_id = $1)
		ORDER BY created_at DESC LIMIT 1`, created.ID).Scan(&actor); err != nil {
		t.Fatalf("reading the audit record: %v", err)
	}
	if actor != s.UserUUID(t, f.Outsider.ID) {
		t.Fatalf("the audit record names %s instead of the joining user %s", actor, f.Outsider.ID)
	}
}

func TestSelfSignupTwiceConflictsAndCreatesNoSecondRow(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	joiner := s.Session(t, f.Outsider)
	support.RequireStatus(t, join(joiner, t, f.EventID, map[string]any{"team_role": "Designer"}),
		http.StatusCreated, "the first self-signup")

	repeat := join(joiner, t, f.EventID, map[string]any{"team_role": "Designer"})
	support.RequireStatus(t, repeat, http.StatusConflict, "the repeated self-signup")
	if code := repeat.ErrorCode(t); code != "already_assigned" {
		t.Fatalf("the refusal carried the code %q instead of already_assigned: %s", code, repeat.Body)
	}

	var rows int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM event_participants
		 WHERE event_id = (SELECT id FROM events WHERE display_id = $1)
		   AND user_id = (SELECT id FROM users WHERE display_id = $2)`,
		f.EventID, f.Outsider.ID).Scan(&rows); err != nil {
		t.Fatalf("counting the participant rows: %v", err)
	}
	if rows != 1 {
		t.Fatalf("the repeated self-signup produced %d rows instead of one", rows)
	}
}

func TestSelfSignupIntoAFinishedEventIsRefused(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	past := time.Now().UTC().Add(-90 * 24 * time.Hour).Truncate(time.Second)
	finished := f.AdminClient.CreateEvent(t, "Finished event", past)
	f.AdminClient.Publish(t, finished)

	joiner := s.Session(t, f.Outsider)
	resp := join(joiner, t, finished, map[string]any{"team_role": "Designer"})
	if resp.Status == http.StatusCreated {
		t.Fatalf("joining a finished event was accepted: %s", resp.Body)
	}

	var rows int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM event_participants
		 WHERE event_id = (SELECT id FROM events WHERE display_id = $1)
		   AND user_id = (SELECT id FROM users WHERE display_id = $2)`,
		finished, f.Outsider.ID).Scan(&rows); err != nil {
		t.Fatalf("counting the participant rows: %v", err)
	}
	if rows != 0 {
		t.Fatalf("a refused self-signup still created %d rows", rows)
	}
}

func TestSelfSignupIntoAnUnpublishedEventIsNotFound(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	draft := f.AdminClient.CreateEvent(t, "Unpublished draft", start)

	joiner := s.Session(t, f.Outsider)
	support.RequireStatus(t, join(joiner, t, draft, map[string]any{"team_role": "Designer"}),
		http.StatusNotFound, "joining an unpublished event")
}

func TestTeamRoleIsRequiredForAHackathonAndOptionalForAMeetup(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	meetup := f.AdminClient.CreateEvent(t, "Community meetup", start)
	support.SetEventTaxonomy(t, f.AdminClient, meetup, map[string]any{"kind": "MEETUP"})
	f.AdminClient.Publish(t, meetup)

	joiner := s.Session(t, f.Outsider)

	withoutRole := join(joiner, t, f.EventID, map[string]any{})
	support.RequireStatus(t, withoutRole, http.StatusBadRequest, "joining a hackathon without a role")
	if !support.ContainsAll(string(withoutRole.Body), "team_role") {
		t.Fatalf("the refusal does not name the team_role field: %s", withoutRole.Body)
	}

	resp := join(joiner, t, meetup, map[string]any{})
	support.RequireStatus(t, resp, http.StatusCreated, "joining a meetup without a role")
	var created joinedParticipant
	resp.Decode(t, &created)
	if created.TeamRole != nil {
		t.Fatalf("a meetup assignment carries the role %q", *created.TeamRole)
	}
}
