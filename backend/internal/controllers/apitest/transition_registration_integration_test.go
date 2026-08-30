//go:build integration

package apitest_test

import (
	"net/http"
	"testing"
)

func TestRegistrationActiveToDisabledCancelsAndKeepsStatuses(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	f.seedPending(t, s)
	f.adminClient.forceStatus(t, f.statusID, "DONE")
	cancelledBefore := s.notificationCount(t, f.eventID, "CANCELLED")

	member := s.session(t, f.member)
	requireErrorCode(t, member.post("/admin/events/"+f.eventID+"/registration/disable", nil),
		http.StatusForbidden, "forbidden", "a participant disabling the registration")
	if state := f.adminClient.registrationState(t, f.eventID).State; state != "ACTIVE" {
		t.Fatalf("the refused attempt moved the registration to %q", state)
	}

	requireStatus(t, f.adminClient.post("/admin/events/"+f.eventID+"/registration/disable", nil),
		http.StatusOK, "disabling the registration")
	if state := f.adminClient.registrationState(t, f.eventID).State; state != "DISABLED" {
		t.Fatalf("the registration is %q instead of DISABLED", state)
	}
	if row := s.statusRow(t, f.statusID); row.Status != "DONE" {
		t.Fatalf("disabling rewrote the registration status to %q", row.Status)
	}
	if pending := s.pendingForStatus(t, f.statusID); pending != 0 {
		t.Fatalf("disabling left %d pending notifications", pending)
	}
	if cancelled := s.notificationCount(t, f.eventID, "CANCELLED"); cancelled < cancelledBefore {
		t.Fatalf("the cancelled count fell from %d to %d", cancelledBefore, cancelled)
	}

	requireErrorCode(t, f.adminClient.post("/admin/events/"+f.eventID+"/registration/disable", nil),
		http.StatusConflict, "invalid_state_transition", "disabling an already disabled registration")
}

func TestRegistrationDisabledToActiveBumpsBothVersions(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	requireStatus(t, f.adminClient.post("/admin/events/"+f.eventID+"/registration/disable", nil),
		http.StatusOK, "disabling the registration")
	before := f.adminClient.registrationState(t, f.eventID)

	member := s.session(t, f.member)
	requireErrorCode(t, member.post("/admin/events/"+f.eventID+"/registration/enable", nil),
		http.StatusForbidden, "forbidden", "a participant enabling the registration")
	if state := f.adminClient.registrationState(t, f.eventID).State; state != "DISABLED" {
		t.Fatalf("the refused attempt moved the registration to %q", state)
	}

	requireStatus(t, f.adminClient.post("/admin/events/"+f.eventID+"/registration/enable", nil),
		http.StatusOK, "enabling the registration")
	after := f.adminClient.registrationState(t, f.eventID)
	if after.State != "ACTIVE" {
		t.Fatalf("the registration is %q instead of ACTIVE", after.State)
	}
	if after.ActivationVersion != before.ActivationVersion+1 {
		t.Fatalf("activation_version went from %d to %d instead of +1",
			before.ActivationVersion, after.ActivationVersion)
	}
	if after.ScheduleVersion != before.ScheduleVersion+1 {
		t.Fatalf("schedule_version went from %d to %d instead of +1",
			before.ScheduleVersion, after.ScheduleVersion)
	}
	if pending := s.pendingForStatus(t, f.statusID); pending == 0 {
		t.Fatalf("reactivation raised no primary notification for the TODO status")
	}

	requireErrorCode(t, f.adminClient.post("/admin/events/"+f.eventID+"/registration/enable", nil),
		http.StatusConflict, "invalid_state_transition", "enabling an already active registration")
}

func TestRegistrationURLChangeBumpsTheContentVersionAndCancelsPending(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	f.seedPending(t, s)
	before := f.adminClient.registrationState(t, f.eventID)
	cancelledBefore := s.notificationCount(t, f.eventID, "CANCELLED")

	member := s.session(t, f.member)
	requireErrorCode(t, member.patch("/admin/events/"+f.eventID+"/registration",
		map[string]any{"url": "https://example.com/moved"}),
		http.StatusForbidden, "forbidden", "a participant rewriting the registration link")
	if after := f.adminClient.registrationState(t, f.eventID); after.URL != before.URL {
		t.Fatalf("the refused attempt rewrote the link to %q", after.URL)
	}

	requireStatus(t, f.adminClient.patch("/admin/events/"+f.eventID+"/registration",
		map[string]any{"url": "https://example.com/moved"}), http.StatusOK, "rewriting the registration link")
	after := f.adminClient.registrationState(t, f.eventID)
	if after.URL != "https://example.com/moved" {
		t.Fatalf("the link stayed at %q", after.URL)
	}
	if after.ContentVersion != before.ContentVersion+1 {
		t.Fatalf("notification_content_version went from %d to %d instead of +1",
			before.ContentVersion, after.ContentVersion)
	}
	if after.ScheduleVersion != before.ScheduleVersion {
		t.Fatalf("a link change moved schedule_version from %d to %d",
			before.ScheduleVersion, after.ScheduleVersion)
	}
	if cancelled := s.notificationCount(t, f.eventID, "CANCELLED"); cancelled <= cancelledBefore {
		t.Fatalf("the link change cancelled nothing beyond the %d already cancelled", cancelledBefore)
	}
}

func TestUnchangedRegistrationLinkLeavesEveryVersionAlone(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	before := f.adminClient.registrationState(t, f.eventID)
	requireStatus(t, f.adminClient.patch("/admin/events/"+f.eventID+"/registration",
		map[string]any{"url": before.URL}), http.StatusOK, "resending the same registration link")

	after := f.adminClient.registrationState(t, f.eventID)
	if after.ContentVersion != before.ContentVersion || after.ScheduleVersion != before.ScheduleVersion {
		t.Fatalf("an unchanged link moved the versions from %d/%d to %d/%d",
			before.ContentVersion, before.ScheduleVersion, after.ContentVersion, after.ScheduleVersion)
	}
}

func TestRegistrationOfAnArchivedEventIsFrozen(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	before := f.adminClient.registrationState(t, f.eventID)
	requireStatus(t, f.adminClient.archive(t, f.eventID), http.StatusOK, "archiving the event")

	requireErrorCode(t, f.adminClient.post("/admin/events/"+f.eventID+"/registration/disable", nil),
		http.StatusConflict, "invalid_state_transition", "disabling the registration of an archived event")
	requireErrorCode(t, f.adminClient.patch("/admin/events/"+f.eventID+"/registration",
		map[string]any{"url": "https://example.com/after-archiving"}),
		http.StatusConflict, "invalid_state_transition", "rewriting the link of an archived event")

	after := f.adminClient.registrationState(t, f.eventID)
	if after.State != before.State || after.URL != before.URL || after.ContentVersion != before.ContentVersion {
		t.Fatalf("the archived registration moved from %+v to %+v", before, after)
	}
}
