//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
)

type joinedParticipant struct {
	ID                  uuid.UUID `json:"id"`
	EventID             uuid.UUID `json:"event_id"`
	TeamRole            *string   `json:"team_role"`
	ParticipationStatus string    `json:"participation_status"`
}

func (c *client) join(t *testing.T, id uuid.UUID, body map[string]any) response {
	t.Helper()
	return c.post("/events/"+id.String()+"/join", body)
}

func TestSelfSignupCreatesAnAssignmentWithTheOwnRole(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	joiner := s.session(t, f.outsider)
	resp := joiner.join(t, f.eventID, map[string]any{"team_role": "Designer"})
	requireStatus(t, resp, http.StatusCreated, "joining a published event")

	var created joinedParticipant
	resp.decode(t, &created)
	if created.EventID != f.eventID {
		t.Fatalf("the participant belongs to %s instead of %s", created.EventID, f.eventID)
	}
	if created.ParticipationStatus != "ASSIGNED" {
		t.Fatalf("the participant is %q instead of ASSIGNED", created.ParticipationStatus)
	}
	if created.TeamRole == nil || *created.TeamRole != "Designer" {
		t.Fatalf("the stated role was not stored: %+v", created.TeamRole)
	}

	items := joiner.catalog(t, "page_size=100")
	for _, item := range items {
		if item.ID == f.eventID && !item.Joined {
			t.Fatalf("the catalog does not report the event as joined")
		}
	}

	roster := f.adminClient.get("/admin/events/" + f.eventID.String() + "/participants")
	requireStatus(t, roster, http.StatusOK, "listing the roster after a self-signup")
	if !containsAll(string(roster.Body), f.outsider.ID.String(), "Designer") {
		t.Fatalf("the self-signed participant is missing from the roster: %s", roster.Body)
	}

	var todo int
	if err := s.db.Pool().QueryRow(context.Background(), `
		SELECT count(*) FROM registration_statuses rs
		JOIN event_participants p ON p.id = rs.participant_id
		WHERE p.user_id = $1 AND rs.status = 'TODO'`, f.outsider.ID).Scan(&todo); err != nil {
		t.Fatalf("counting the registration statuses: %v", err)
	}
	if todo != 1 {
		t.Fatalf("expected exactly one TODO status after joining, got %d", todo)
	}

	var actor uuid.UUID
	if err := s.db.Pool().QueryRow(context.Background(), `
		SELECT actor_user_id FROM audit_log
		WHERE entity_type = 'EVENT_PARTICIPANT' AND entity_id = $1
		ORDER BY created_at DESC LIMIT 1`, created.ID).Scan(&actor); err != nil {
		t.Fatalf("reading the audit record: %v", err)
	}
	if actor != f.outsider.ID {
		t.Fatalf("the audit record names %s instead of the joining user %s", actor, f.outsider.ID)
	}
}

func TestSelfSignupTwiceConflictsAndCreatesNoSecondRow(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	joiner := s.session(t, f.outsider)
	requireStatus(t, joiner.join(t, f.eventID, map[string]any{"team_role": "Designer"}),
		http.StatusCreated, "the first self-signup")

	repeat := joiner.join(t, f.eventID, map[string]any{"team_role": "Designer"})
	requireStatus(t, repeat, http.StatusConflict, "the repeated self-signup")
	if code := repeat.errorCode(t); code != "already_assigned" {
		t.Fatalf("the refusal carried the code %q instead of already_assigned: %s", code, repeat.Body)
	}

	var rows int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM event_participants WHERE event_id = $1 AND user_id = $2`,
		f.eventID, f.outsider.ID).Scan(&rows); err != nil {
		t.Fatalf("counting the participant rows: %v", err)
	}
	if rows != 1 {
		t.Fatalf("the repeated self-signup produced %d rows instead of one", rows)
	}
}

func TestSelfSignupIntoAFinishedEventIsRefused(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	past := time.Now().UTC().Add(-90 * 24 * time.Hour).Truncate(time.Second)
	finished := f.adminClient.createEvent(t, "Finished event", past)
	f.adminClient.publish(t, finished)

	joiner := s.session(t, f.outsider)
	resp := joiner.join(t, finished, map[string]any{"team_role": "Designer"})
	if resp.Status == http.StatusCreated {
		t.Fatalf("joining a finished event was accepted: %s", resp.Body)
	}

	var rows int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM event_participants WHERE event_id = $1 AND user_id = $2`,
		finished, f.outsider.ID).Scan(&rows); err != nil {
		t.Fatalf("counting the participant rows: %v", err)
	}
	if rows != 0 {
		t.Fatalf("a refused self-signup still created %d rows", rows)
	}
}

func TestSelfSignupIntoAnUnpublishedEventIsNotFound(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	draft := f.adminClient.createEvent(t, "Unpublished draft", start)

	joiner := s.session(t, f.outsider)
	requireStatus(t, joiner.join(t, draft, map[string]any{"team_role": "Designer"}),
		http.StatusNotFound, "joining an unpublished event")
}

func TestTeamRoleIsRequiredForAHackathonAndOptionalForAMeetup(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	meetup := f.adminClient.createEvent(t, "Community meetup", start)
	f.adminClient.setEventTaxonomy(t, meetup, map[string]any{"kind": "MEETUP"})
	f.adminClient.publish(t, meetup)

	joiner := s.session(t, f.outsider)

	withoutRole := joiner.join(t, f.eventID, map[string]any{})
	requireStatus(t, withoutRole, http.StatusBadRequest, "joining a hackathon without a role")
	if !containsAll(string(withoutRole.Body), "team_role") {
		t.Fatalf("the refusal does not name the team_role field: %s", withoutRole.Body)
	}

	resp := joiner.join(t, meetup, map[string]any{})
	requireStatus(t, resp, http.StatusCreated, "joining a meetup without a role")
	var created joinedParticipant
	resp.decode(t, &created)
	if created.TeamRole != nil {
		t.Fatalf("a meetup assignment carries the role %q", *created.TeamRole)
	}
}
