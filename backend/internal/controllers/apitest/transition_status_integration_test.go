//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestStatusTodoToDoneBelongsToTheOwnerAndTheAdmin(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	if row := statusRow(s, t, f.StatusID); row.Status != "TODO" || row.TodoCycle != 1 || row.RegisteredAt != nil {
		t.Fatalf("a seeded status is %+v instead of a fresh TODO", row)
	}
	f.seedPending(t, s)

	outsider := s.Session(t, f.Outsider)
	requireErrorCode(t, outsider.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusNotFound, "not_found", "an unassigned user reporting a registration")
	if row := statusRow(s, t, f.StatusID); row.Status != "TODO" {
		t.Fatalf("the refused attempt moved the status to %q", row.Status)
	}

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusOK, "the owner reporting a registration")

	done := statusRow(s, t, f.StatusID)
	if done.Status != "DONE" {
		t.Fatalf("the owner report left the status at %q", done.Status)
	}
	if done.RegisteredAt == nil {
		t.Fatalf("registered_at stayed empty after DONE: %+v", done)
	}
	if done.TodoCycle != 1 {
		t.Fatalf("todo_cycle moved to %d on entering DONE", done.TodoCycle)
	}
	if pending := pendingForStatus(s, t, f.StatusID); pending != 0 {
		t.Fatalf("DONE left %d pending notifications on the status", pending)
	}
}

func TestStatusDoneToTodoIsAdminOnlyAndCyclesTheCounter(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	forceStatus(f.AdminClient, t, f.StatusID, "DONE")
	before := statusRow(s, t, f.StatusID)
	if before.RegisteredAt == nil {
		t.Fatalf("the administrative DONE recorded no registered_at: %+v", before)
	}

	member := s.Session(t, f.Member)
	requireErrorCode(t, setStatus(member, t, f.StatusID, "TODO"),
		http.StatusForbidden, "forbidden", "a participant returning a status to TODO")
	if row := statusRow(s, t, f.StatusID); row.Status != "DONE" {
		t.Fatalf("the refused attempt moved the status to %q", row.Status)
	}

	forceStatus(f.AdminClient, t, f.StatusID, "TODO")
	after := statusRow(s, t, f.StatusID)
	if after.Status != "TODO" {
		t.Fatalf("the administrative return left the status at %q", after.Status)
	}
	if after.TodoCycle != before.TodoCycle+1 {
		t.Fatalf("todo_cycle went from %d to %d instead of +1", before.TodoCycle, after.TodoCycle)
	}
	if after.RegisteredAt != nil {
		t.Fatalf("registered_at survived the return to TODO: %+v", after)
	}
}

func TestStatusTodoAndDoneReachNotRequiredAndCancelPending(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	f.seedPending(t, s)
	cancelledBefore := notificationCount(s, t, f.EventID, "CANCELLED")

	member := s.Session(t, f.Member)
	requireErrorCode(t, setStatus(member, t, f.StatusID, "NOT_REQUIRED"),
		http.StatusForbidden, "forbidden", "a participant excusing itself from registration")
	if row := statusRow(s, t, f.StatusID); row.Status != "TODO" {
		t.Fatalf("the refused attempt moved the status to %q", row.Status)
	}

	forceStatus(f.AdminClient, t, f.StatusID, "NOT_REQUIRED")
	if row := statusRow(s, t, f.StatusID); row.Status != "NOT_REQUIRED" {
		t.Fatalf("TODO did not reach NOT_REQUIRED, it is %q", row.Status)
	}

	forceStatus(f.AdminClient, t, f.StatusID, "TODO")
	forceStatus(f.AdminClient, t, f.StatusID, "DONE")
	forceStatus(f.AdminClient, t, f.StatusID, "NOT_REQUIRED")
	excused := statusRow(s, t, f.StatusID)
	if excused.Status != "NOT_REQUIRED" {
		t.Fatalf("DONE did not reach NOT_REQUIRED, it is %q", excused.Status)
	}
	if excused.RegisteredAt != nil {
		t.Fatalf("registered_at survived the move out of DONE: %+v", excused)
	}
	if cancelled := notificationCount(s, t, f.EventID, "CANCELLED"); cancelled <= cancelledBefore {
		t.Fatalf("the status changes cancelled nothing beyond the %d already cancelled", cancelledBefore)
	}
	if pending := pendingForStatus(s, t, f.StatusID); pending != 0 {
		t.Fatalf("NOT_REQUIRED left %d pending notifications on the status", pending)
	}
}

func TestStatusNotRequiredReturnsToTodoAndRestartsTheCycle(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	forceStatus(f.AdminClient, t, f.StatusID, "NOT_REQUIRED")
	before := statusRow(s, t, f.StatusID)

	member := s.Session(t, f.Member)
	requireErrorCode(t, setStatus(member, t, f.StatusID, "TODO"),
		http.StatusForbidden, "forbidden", "a participant reopening its own excused status")
	if row := statusRow(s, t, f.StatusID); row.Status != "NOT_REQUIRED" {
		t.Fatalf("the refused attempt moved the status to %q", row.Status)
	}

	forceStatus(f.AdminClient, t, f.StatusID, "TODO")
	after := statusRow(s, t, f.StatusID)
	if after.Status != "TODO" {
		t.Fatalf("NOT_REQUIRED did not return to TODO, it is %q", after.Status)
	}
	if after.TodoCycle != before.TodoCycle+1 {
		t.Fatalf("todo_cycle went from %d to %d instead of +1", before.TodoCycle, after.TodoCycle)
	}
}

func TestStatusNotRequiredCannotBeMarkedDoneDirectly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	forceStatus(f.AdminClient, t, f.StatusID, "NOT_REQUIRED")
	requireErrorCode(t, setStatus(f.AdminClient, t, f.StatusID, "DONE"),
		http.StatusConflict, "invalid_state_transition",
		"an administrator marking an excused participant registered")
	if row := statusRow(s, t, f.StatusID); row.Status != "NOT_REQUIRED" {
		t.Fatalf("the refused attempt moved the status to %q", row.Status)
	}
}

func TestOwnerReportIsRefusedFromNotRequired(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	forceStatus(f.AdminClient, t, f.StatusID, "NOT_REQUIRED")

	member := s.Session(t, f.Member)
	requireErrorCode(t, member.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusConflict, "invalid_state_transition",
		"an excused participant reporting a registration")
	if row := statusRow(s, t, f.StatusID); row.Status != "NOT_REQUIRED" {
		t.Fatalf("the refused report moved the status to %q", row.Status)
	}
}

func TestOwnerReportIsRefusedWhileTheRegistrationIsDisabledOrTheEventArchived(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/registration/disable", nil),
		http.StatusOK, "disabling the registration")

	member := s.Session(t, f.Member)
	requireErrorCode(t, member.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusConflict, "invalid_state_transition", "reporting into a disabled registration")
	if row := statusRow(s, t, f.StatusID); row.Status != "TODO" {
		t.Fatalf("the refused report moved the status to %q", row.Status)
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/registration/enable", nil),
		http.StatusOK, "enabling the registration again")
	support.RequireStatus(t, archive(f.AdminClient, t, f.EventID), http.StatusOK, "archiving the event")

	requireErrorCode(t, member.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusConflict, "invalid_state_transition", "reporting into an archived event")
	if row := statusRow(s, t, f.StatusID); row.Status != "TODO" {
		t.Fatalf("the refused report moved the status to %q", row.Status)
	}
}

func TestOwnerReportIsRefusedAfterRemovalFromTheRoster(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/participants/batch-remove",
		map[string]any{"participant_ids": []string{f.MemberPart}}),
		http.StatusOK, "removing the member from the roster")

	member := s.Session(t, f.Member)
	requireErrorCode(t, member.Post("/events/"+f.EventID+"/registration/done", nil),
		http.StatusNotFound, "not_found", "a removed participant reporting a registration")
	if row := statusRow(s, t, f.StatusID); row.Status != "TODO" {
		t.Fatalf("the refused report moved the status to %q", row.Status)
	}
}

func TestAdminStatusChangeRejectsAnUnknownValue(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	requireErrorCode(t, setStatus(f.AdminClient, t, f.StatusID, "REGISTERED"),
		http.StatusBadRequest, "validation_failed", "an administrator using a status outside the enumeration")
	if row := statusRow(s, t, f.StatusID); row.Status != "TODO" {
		t.Fatalf("the refused attempt moved the status to %q", row.Status)
	}
}
