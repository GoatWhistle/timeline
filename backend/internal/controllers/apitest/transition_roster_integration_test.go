//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"
)

func (c *client) removeMany(t *testing.T, eventID uuid.UUID, ids ...uuid.UUID) response {
	t.Helper()
	keys := make([]string, 0, len(ids))
	for _, id := range ids {
		keys = append(keys, id.String())
	}
	return c.post("/admin/events/"+eventID.String()+"/participants/batch-remove",
		map[string]any{"participant_ids": keys})
}

func (s *stack) assignmentVersion(t *testing.T, participantID uuid.UUID) int {
	t.Helper()
	var version int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT assignment_version FROM event_participants WHERE id = $1`, participantID).Scan(&version); err != nil {
		t.Fatalf("reading the assignment version of %s: %v", participantID, err)
	}
	return version
}

func TestParticipantAssignedToRemovedCancelsAndIsNotRepeatable(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	f.seedPending(t, s)
	cancelledBefore := s.notificationCount(t, f.eventID, "CANCELLED")

	member := s.session(t, f.member)
	requireErrorCode(t, member.removeMany(t, f.eventID, f.memberPart),
		http.StatusForbidden, "forbidden", "a participant removing itself from the roster")
	if state := s.participationStatus(t, f.memberPart); state != "ASSIGNED" {
		t.Fatalf("the refused attempt moved the participant to %q", state)
	}

	requireStatus(t, f.adminClient.removeMany(t, f.eventID, f.memberPart),
		http.StatusOK, "removing the member")
	if state := s.participationStatus(t, f.memberPart); state != "REMOVED" {
		t.Fatalf("the participant is %q instead of REMOVED", state)
	}
	if pending := s.pendingForStatus(t, f.statusID); pending != 0 {
		t.Fatalf("removal left %d pending notifications", pending)
	}
	if cancelled := s.notificationCount(t, f.eventID, "CANCELLED"); cancelled <= cancelledBefore {
		t.Fatalf("removal cancelled nothing beyond the %d already cancelled", cancelledBefore)
	}
	if row := s.statusRow(t, f.statusID); row.Status != "TODO" {
		t.Fatalf("removal rewrote the registration status to %q", row.Status)
	}

	repeat := f.adminClient.removeMany(t, f.eventID, f.memberPart)
	requireStatus(t, repeat, http.StatusOK, "removing an already removed participant")
	if !containsAll(string(repeat.Body), `"already_removed"`, `"skipped"`) {
		t.Fatalf("a repeated removal is not reported as skipped: %s", repeat.Body)
	}
}

func TestParticipantRemovedToAssignedBumpsTheAssignmentVersion(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	requireStatus(t, f.adminClient.removeMany(t, f.eventID, f.memberPart),
		http.StatusOK, "removing the member")
	before := s.assignmentVersion(t, f.memberPart)

	member := s.session(t, f.member)
	requireErrorCode(t, member.post("/admin/participants/"+f.memberPart.String()+"/reactivate",
		map[string]any{"team_role": "Developer"}),
		http.StatusForbidden, "forbidden", "a participant reactivating itself")
	if state := s.participationStatus(t, f.memberPart); state != "REMOVED" {
		t.Fatalf("the refused attempt moved the participant to %q", state)
	}

	requireStatus(t, f.adminClient.post("/admin/participants/"+f.memberPart.String()+"/reactivate",
		map[string]any{"team_role": "Developer"}), http.StatusOK, "reactivating the member")
	if state := s.participationStatus(t, f.memberPart); state != "ASSIGNED" {
		t.Fatalf("the participant is %q instead of ASSIGNED", state)
	}
	after := s.assignmentVersion(t, f.memberPart)
	if after != before+1 {
		t.Fatalf("assignment_version went from %d to %d instead of +1", before, after)
	}

	requireErrorCode(t, f.adminClient.post("/admin/participants/"+f.memberPart.String()+"/reactivate",
		map[string]any{"team_role": "Developer"}),
		http.StatusConflict, "already_assigned", "reactivating an already assigned participant")
	if again := s.assignmentVersion(t, f.memberPart); again != after {
		t.Fatalf("the refused reactivation still bumped assignment_version to %d", again)
	}
}

func TestReactivationIsRefusedForADeactivatedAccount(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	requireStatus(t, f.adminClient.removeMany(t, f.eventID, f.memberPart),
		http.StatusOK, "removing the member")
	requireStatus(t, f.adminClient.post("/admin/users/"+f.member.ID.String()+"/deactivate", nil),
		http.StatusOK, "deactivating the member")

	requireErrorCode(t, f.adminClient.post("/admin/participants/"+f.memberPart.String()+"/reactivate",
		map[string]any{"team_role": "Developer"}),
		http.StatusConflict, "user_inactive", "reactivating a deactivated account")
	if state := s.participationStatus(t, f.memberPart); state != "REMOVED" {
		t.Fatalf("the refused reactivation moved the participant to %q", state)
	}
}

func TestParticipantOfAForeignEventIsNotRemovable(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	resp := f.adminClient.removeMany(t, f.otherEvent, f.memberPart)
	requireStatus(t, resp, http.StatusOK, "removing a foreign participant through another event")
	if !containsAll(string(resp.Body), `"not_found"`) {
		t.Fatalf("a cross-event removal is not reported as not found: %s", resp.Body)
	}
	if state := s.participationStatus(t, f.memberPart); state != "ASSIGNED" {
		t.Fatalf("a cross-event removal changed the participant to %q", state)
	}
}
