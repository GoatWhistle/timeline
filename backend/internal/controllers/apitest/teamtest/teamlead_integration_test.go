//go:build integration

package teamtest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestATeamMemberOutsideTheRosterCannotBeMarkedByTheLead(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 1, &minimum, nil)

	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID)

	support.RequireErrorCode(t, markMember(f.LeadClient, f.TeamID, f.EventID, f.Mates[0].ID),
		http.StatusNotFound, "not_found", "marking a teammate absent from this event's lineup")
	if value := statusValueOf(s, t, f.EventID, f.Mates[0].ID); value != "TODO" {
		t.Fatalf("the refused mark moved the teammate to %q", value)
	}
}

func TestLeadMarksAMemberOfTheirOwnRosterAndIsRefusedForAnother(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 1, &minimum, nil)
	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID, f.Mates[0].ID)

	other := seedForeignTeamOn(s, t, f)

	if value := statusValueOf(s, t, f.EventID, f.Mates[0].ID); value != "TODO" {
		t.Fatalf("the mate starts at %q instead of TODO", value)
	}
	support.RequireStatus(t, markMember(f.LeadClient, f.TeamID, f.EventID, f.Mates[0].ID),
		http.StatusOK, "the lead marking a member of their own lineup")
	if value := statusValueOf(s, t, f.EventID, f.Mates[0].ID); value != "DONE" {
		t.Fatalf("the lead's mark left the member at %q", value)
	}

	support.RequireErrorCode(t, markMember(f.LeadClient, f.TeamID, f.EventID, other.MemberID),
		http.StatusNotFound, "not_found", "the lead marking a user outside their team")
	if value := statusValueOf(s, t, f.EventID, other.MemberID); value != "TODO" {
		t.Fatalf("the refused mark moved the foreign member to %q", value)
	}

	support.RequireErrorCode(t, markMember(f.LeadClient, other.TeamID, f.EventID, other.MemberID),
		http.StatusNotFound, "not_found", "the lead marking through somebody else's team")
	if value := statusValueOf(s, t, f.EventID, other.MemberID); value != "TODO" {
		t.Fatalf("the refused mark through a foreign team moved the member to %q", value)
	}
}

func TestAPlainMemberCannotMarkOrShapeTheRoster(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 2, &minimum, nil)
	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID, f.Mates[0].ID)

	mate := s.Session(t, f.Mates[0])
	support.RequireErrorCode(t, markMember(mate, f.TeamID, f.EventID, f.Lead.ID),
		http.StatusForbidden, "forbidden", "a plain member marking another member")
	support.RequireErrorCode(t, addToRoster(mate, f.TeamID, f.EventID, f.Mates[1].ID),
		http.StatusForbidden, "forbidden", "a plain member adding to the lineup")
	support.RequireErrorCode(t, removeFromRoster(mate, f.TeamID, f.EventID, f.Lead.ID),
		http.StatusForbidden, "forbidden", "a plain member trimming the lineup")

	if value := statusValueOf(s, t, f.EventID, f.Lead.ID); value != "TODO" {
		t.Fatalf("the refused mark moved the lead to %q", value)
	}
	if standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID); standing.RosterSize != 2 {
		t.Fatalf("the refused edits left %d on the lineup", standing.RosterSize)
	}
}

func TestTheLeadsMarkIsRecordedInTheAuditLogAgainstTheLead(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 1, &minimum, nil)
	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	fillRoster(f.LeadClient, t, f.TeamID, f.EventID, f.Lead.ID, f.Mates[0].ID)

	support.RequireStatus(t, markMember(f.LeadClient, f.TeamID, f.EventID, f.Mates[0].ID),
		http.StatusOK, "the lead marking a member")

	var (
		actor   string
		subject string
		relayed bool
	)
	if err := s.DB().Pool().QueryRow(context.Background(), `
		SELECT au.display_id,
		       (SELECT su.display_id FROM users su
		        WHERE su.id = (a.after_json ->> 'subject_user_id')::uuid),
		       coalesce((a.after_json ->> 'marked_by_team_lead')::boolean, false)
		FROM audit_log a
		JOIN users au ON au.id = a.actor_user_id
		WHERE a.action = 'STATUS_CHANGE'
		  AND a.after_json ? 'marked_by_team_lead'
		ORDER BY a.created_at DESC LIMIT 1`).Scan(&actor, &subject, &relayed); err != nil {
		t.Fatalf("reading the audit record of the lead's mark: %v", err)
	}
	if actor != f.Lead.ID {
		t.Fatalf("the audit actor is %q instead of the lead %q", actor, f.Lead.ID)
	}
	if subject != f.Mates[0].ID {
		t.Fatalf("the audit subject is %q instead of the marked member %q", subject, f.Mates[0].ID)
	}
	if !relayed {
		t.Fatalf("the audit record does not say the lead relayed the report")
	}
}

func TestTheLeadCannotMarkARosterMemberAbsentFromTheEventRoster(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 1, &minimum, nil)
	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)

	support.RequireStatus(t, f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"user_id": f.Outsider.ID}), http.StatusOK, "inviting the outsider")
	joined := s.Session(t, f.Outsider)
	support.RequireStatus(t, joined.Post("/teams/"+f.TeamID+"/membership", nil),
		http.StatusOK, "the outsider joining the team")
	support.RequireStatus(t, addToRoster(f.LeadClient, f.TeamID, f.EventID, f.Outsider.ID),
		http.StatusOK, "putting the newcomer on the lineup")

	support.RequireErrorCode(t, markMember(f.LeadClient, f.TeamID, f.EventID, f.Outsider.ID),
		http.StatusNotFound, "not_found", "marking a lineup member absent from the event roster")
}

func TestOnlyTheLeadEntersAnEventAndOnlyAHackathonAcceptsIt(t *testing.T) {
	s := support.NewStack(t)
	f := seedTeam(s, t, 1, nil, nil)

	mate := s.Session(t, f.Mates[0])
	support.RequireErrorCode(t, mate.Post("/teams/"+f.TeamID+"/events",
		map[string]any{"event_id": f.EventID}),
		http.StatusForbidden, "forbidden", "a plain member entering an event")

	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)
	support.RequireErrorCode(t, f.LeadClient.Post("/teams/"+f.TeamID+"/events",
		map[string]any{"event_id": f.EventID}),
		http.StatusConflict, "already_entered", "entering the same event twice")

	meetupID := createMeetup(f.AdminClient, t)
	support.RequireErrorCode(t, f.LeadClient.Post("/teams/"+f.TeamID+"/events",
		map[string]any{"event_id": meetupID}),
		http.StatusConflict, "invalid_state_transition", "entering a meetup as a team")
}

func TestAnInvitedMemberCannotBePutOnARosterBeforeAccepting(t *testing.T) {
	s := support.NewStack(t)
	minimum := 2
	f := seedTeam(s, t, 1, &minimum, nil)
	enterEvent(f.LeadClient, t, f.TeamID, f.EventID)

	support.RequireStatus(t, f.LeadClient.Post("/teams/"+f.TeamID+"/invitations",
		map[string]any{"user_id": f.Outsider.ID}), http.StatusOK, "inviting the outsider")

	support.RequireErrorCode(t, addToRoster(f.LeadClient, f.TeamID, f.EventID, f.Outsider.ID),
		http.StatusNotFound, "not_found", "putting an unaccepted invitee on the lineup")
	support.RequireErrorCode(t, markMember(f.LeadClient, f.TeamID, f.EventID, f.Outsider.ID),
		http.StatusNotFound, "not_found", "marking an unaccepted invitee")

	if standing := readStanding(f.LeadClient, t, f.TeamID, f.EventID); standing.RosterSize != 0 {
		t.Fatalf("the refused addition put %d on the lineup", standing.RosterSize)
	}
}
