//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func removeMany(c *support.Client, t *testing.T, eventID string, ids ...string) support.Response {
	t.Helper()
	keys := make([]string, 0, len(ids))
	for _, id := range ids {
		keys = append(keys, id)
	}
	return c.Post("/admin/events/"+eventID+"/participants/batch-remove",
		map[string]any{"participant_ids": keys})
}

func assignmentVersion(s *support.Stack, t *testing.T, participantID string) int {
	t.Helper()
	var version int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT assignment_version FROM event_participants WHERE display_id = $1`, participantID).Scan(&version); err != nil {
		t.Fatalf("reading the assignment version of %s: %v", participantID, err)
	}
	return version
}

func TestParticipantAssignedToRemovedCancelsAndIsNotRepeatable(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	seedPending(f, t, s)
	cancelledBefore := notificationCount(s, t, f.EventID, "CANCELLED")

	member := s.Session(t, f.Member)
	requireErrorCode(t, removeMany(member, t, f.EventID, f.MemberPart),
		http.StatusForbidden, "forbidden", "a participant removing itself from the roster")
	if state := participationStatus(s, t, f.MemberPart); state != "ASSIGNED" {
		t.Fatalf("the refused attempt moved the participant to %q", state)
	}

	support.RequireStatus(t, removeMany(f.AdminClient, t, f.EventID, f.MemberPart),
		http.StatusOK, "removing the member")
	if state := participationStatus(s, t, f.MemberPart); state != "REMOVED" {
		t.Fatalf("the participant is %q instead of REMOVED", state)
	}
	if pending := pendingForStatus(s, t, f.StatusID); pending != 0 {
		t.Fatalf("removal left %d pending notifications", pending)
	}
	if cancelled := notificationCount(s, t, f.EventID, "CANCELLED"); cancelled <= cancelledBefore {
		t.Fatalf("removal cancelled nothing beyond the %d already cancelled", cancelledBefore)
	}
	if row := statusRow(s, t, f.StatusID); row.Status != "TODO" {
		t.Fatalf("removal rewrote the registration status to %q", row.Status)
	}

	repeat := removeMany(f.AdminClient, t, f.EventID, f.MemberPart)
	support.RequireStatus(t, repeat, http.StatusOK, "removing an already removed participant")
	if !support.ContainsAll(string(repeat.Body), `"already_removed"`, `"skipped"`) {
		t.Fatalf("a repeated removal is not reported as skipped: %s", repeat.Body)
	}
}

func TestParticipantRemovedToAssignedBumpsTheAssignmentVersion(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, removeMany(f.AdminClient, t, f.EventID, f.MemberPart),
		http.StatusOK, "removing the member")
	before := assignmentVersion(s, t, f.MemberPart)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Post("/events/"+f.EventID+"/join",
		map[string]any{"team_role": "Developer"}), http.StatusCreated, "rejoining after removal")
	if state := participationStatus(s, t, f.MemberPart); state != "ASSIGNED" {
		t.Fatalf("the participant is %q instead of ASSIGNED", state)
	}
	after := assignmentVersion(s, t, f.MemberPart)
	if after != before+1 {
		t.Fatalf("assignment_version went from %d to %d instead of +1", before, after)
	}

	requireErrorCode(t, member.Post("/events/"+f.EventID+"/join",
		map[string]any{"team_role": "Developer"}),
		http.StatusConflict, "already_assigned", "rejoining an event already joined")
	if again := assignmentVersion(s, t, f.MemberPart); again != after {
		t.Fatalf("the refused rejoin still bumped assignment_version to %d", again)
	}
}

func TestRejoiningIsRefusedForADeactivatedAccount(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, removeMany(f.AdminClient, t, f.EventID, f.MemberPart),
		http.StatusOK, "removing the member")
	support.RequireStatus(t, f.AdminClient.Post("/admin/users/"+f.Member.ID+"/deactivate", nil),
		http.StatusOK, "deactivating the member")

	requireErrorCode(t, member.Post("/events/"+f.EventID+"/join",
		map[string]any{"team_role": "Developer"}),
		http.StatusForbidden, "forbidden", "a deactivated account rejoining an event")
	if state := participationStatus(s, t, f.MemberPart); state != "REMOVED" {
		t.Fatalf("the refused rejoin moved the participant to %q", state)
	}
}

func TestParticipantOfAForeignEventIsNotRemovable(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	resp := removeMany(f.AdminClient, t, f.OtherEvent, f.MemberPart)
	support.RequireStatus(t, resp, http.StatusOK, "removing a foreign participant through another event")
	if !support.ContainsAll(string(resp.Body), `"not_found"`) {
		t.Fatalf("a cross-event removal is not reported as not found: %s", resp.Body)
	}
	if state := participationStatus(s, t, f.MemberPart); state != "ASSIGNED" {
		t.Fatalf("a cross-event removal changed the participant to %q", state)
	}
}
