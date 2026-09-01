//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestRegistrationActiveToDisabledCancelsAndKeepsStatuses(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	f.seedPending(t, s)
	forceStatus(f.AdminClient, t, f.StatusID, "DONE")
	cancelledBefore := notificationCount(s, t, f.EventID, "CANCELLED")

	member := s.Session(t, f.Member)
	requireErrorCode(t, member.Post("/admin/events/"+f.EventID+"/registration/disable", nil),
		http.StatusForbidden, "forbidden", "a participant disabling the registration")
	if state := registrationState(f.AdminClient, t, f.EventID).State; state != "ACTIVE" {
		t.Fatalf("the refused attempt moved the registration to %q", state)
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/registration/disable", nil),
		http.StatusOK, "disabling the registration")
	if state := registrationState(f.AdminClient, t, f.EventID).State; state != "DISABLED" {
		t.Fatalf("the registration is %q instead of DISABLED", state)
	}
	if row := statusRow(s, t, f.StatusID); row.Status != "DONE" {
		t.Fatalf("disabling rewrote the registration status to %q", row.Status)
	}
	if pending := pendingForStatus(s, t, f.StatusID); pending != 0 {
		t.Fatalf("disabling left %d pending notifications", pending)
	}
	if cancelled := notificationCount(s, t, f.EventID, "CANCELLED"); cancelled < cancelledBefore {
		t.Fatalf("the cancelled count fell from %d to %d", cancelledBefore, cancelled)
	}

	requireErrorCode(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/registration/disable", nil),
		http.StatusConflict, "invalid_state_transition", "disabling an already disabled registration")
}

func TestRegistrationDisabledToActiveBumpsBothVersions(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/registration/disable", nil),
		http.StatusOK, "disabling the registration")
	before := registrationState(f.AdminClient, t, f.EventID)

	member := s.Session(t, f.Member)
	requireErrorCode(t, member.Post("/admin/events/"+f.EventID+"/registration/enable", nil),
		http.StatusForbidden, "forbidden", "a participant enabling the registration")
	if state := registrationState(f.AdminClient, t, f.EventID).State; state != "DISABLED" {
		t.Fatalf("the refused attempt moved the registration to %q", state)
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/registration/enable", nil),
		http.StatusOK, "enabling the registration")
	after := registrationState(f.AdminClient, t, f.EventID)
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
	if pending := pendingForStatus(s, t, f.StatusID); pending == 0 {
		t.Fatalf("reactivation raised no primary notification for the TODO status")
	}

	requireErrorCode(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/registration/enable", nil),
		http.StatusConflict, "invalid_state_transition", "enabling an already active registration")
}

func TestRegistrationURLChangeBumpsTheContentVersionAndCancelsPending(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	f.seedPending(t, s)
	before := registrationState(f.AdminClient, t, f.EventID)
	cancelledBefore := notificationCount(s, t, f.EventID, "CANCELLED")

	member := s.Session(t, f.Member)
	requireErrorCode(t, member.Patch("/admin/events/"+f.EventID+"/registration",
		map[string]any{"url": "https://example.com/moved"}),
		http.StatusForbidden, "forbidden", "a participant rewriting the registration link")
	if after := registrationState(f.AdminClient, t, f.EventID); after.URL != before.URL {
		t.Fatalf("the refused attempt rewrote the link to %q", after.URL)
	}

	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+f.EventID+"/registration",
		map[string]any{"url": "https://example.com/moved"}), http.StatusOK, "rewriting the registration link")
	after := registrationState(f.AdminClient, t, f.EventID)
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
	if cancelled := notificationCount(s, t, f.EventID, "CANCELLED"); cancelled <= cancelledBefore {
		t.Fatalf("the link change cancelled nothing beyond the %d already cancelled", cancelledBefore)
	}
}

func TestUnchangedRegistrationLinkLeavesEveryVersionAlone(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	before := registrationState(f.AdminClient, t, f.EventID)
	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+f.EventID+"/registration",
		map[string]any{"url": before.URL}), http.StatusOK, "resending the same registration link")

	after := registrationState(f.AdminClient, t, f.EventID)
	if after.ContentVersion != before.ContentVersion || after.ScheduleVersion != before.ScheduleVersion {
		t.Fatalf("an unchanged link moved the versions from %d/%d to %d/%d",
			before.ContentVersion, before.ScheduleVersion, after.ContentVersion, after.ScheduleVersion)
	}
}

func TestRegistrationOfAnArchivedEventIsFrozen(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	before := registrationState(f.AdminClient, t, f.EventID)
	support.RequireStatus(t, archive(f.AdminClient, t, f.EventID), http.StatusOK, "archiving the event")

	requireErrorCode(t, f.AdminClient.Post("/admin/events/"+f.EventID+"/registration/disable", nil),
		http.StatusConflict, "invalid_state_transition", "disabling the registration of an archived event")
	requireErrorCode(t, f.AdminClient.Patch("/admin/events/"+f.EventID+"/registration",
		map[string]any{"url": "https://example.com/after-archiving"}),
		http.StatusConflict, "invalid_state_transition", "rewriting the link of an archived event")

	after := registrationState(f.AdminClient, t, f.EventID)
	if after.State != before.State || after.URL != before.URL || after.ContentVersion != before.ContentVersion {
		t.Fatalf("the archived registration moved from %+v to %+v", before, after)
	}
}
