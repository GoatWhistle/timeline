//go:build integration

package authz_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
)

func TestQueueListsTerminalFailuresWithTheirReason(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	failed := s.notificationOf(t, f.statusID)
	s.markTerminal(t, failed, "FAILED", "provider refused the message four times")

	page := f.adminClient.queue(t, "failures")
	entry := findEntry(t, page, failed)

	if entry.Status != "FAILED" {
		t.Fatalf("entry status = %q, want FAILED", entry.Status)
	}
	if entry.LastError == nil || *entry.LastError != "provider refused the message four times" {
		t.Fatalf("the failure came back without its reason: %+v", entry)
	}
	if entry.AttemptCount != 4 {
		t.Fatalf("attempt_count = %d, want the 4 recorded provider calls", entry.AttemptCount)
	}
}

func TestQueueListsUndeliverableAlongsideFailed(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	id := s.notificationOf(t, f.statusID)
	s.markTerminal(t, id, "UNDELIVERABLE", "no channel is available for the recipient")

	entry := findEntry(t, f.adminClient.queue(t, "failures"), id)
	if entry.Status != "UNDELIVERABLE" {
		t.Fatalf("entry status = %q, want UNDELIVERABLE", entry.Status)
	}
}

func TestQueueSeparatesStuckLeasesFromFailures(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	stuck := s.notificationOf(t, f.statusID)
	s.expireLease(t, stuck)

	leases := f.adminClient.queue(t, "stuck-leases")
	entry := findEntry(t, leases, stuck)
	if entry.Status != "PROCESSING" {
		t.Fatalf("a stuck lease came back with status %q", entry.Status)
	}
	if entry.LeaseExpiresAt == nil {
		t.Fatalf("a stuck lease came back without lease_expires_at: %+v", entry)
	}
	if entry.LeaseOverdueS == nil || *entry.LeaseOverdueS <= 0 {
		t.Fatalf("a lease overdue by minutes reported lease_overdue_seconds %v", entry.LeaseOverdueS)
	}

	for _, item := range f.adminClient.queue(t, "failures").Items {
		if item.ID == stuck {
			t.Fatal("a stuck lease was reported among the terminal failures")
		}
	}
}

func TestQueueLeavesTheStuckLeaseAloneAndDoesNotRecoverIt(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	stuck := s.notificationOf(t, f.statusID)
	s.expireLease(t, stuck)

	f.adminClient.queue(t, "stuck-leases")
	f.adminClient.queue(t, "stuck-leases")

	if status := s.notificationStatus(t, stuck); status != "PROCESSING" {
		t.Fatalf("reading the diagnostics moved the entry to %q: the endpoint reports, "+
			"the recovery task of specification section 9.4.9 recovers", status)
	}
	if len(f.adminClient.queue(t, "stuck-leases").Items) == 0 {
		t.Fatal("the stuck lease vanished from the diagnostics after being read")
	}
}

func TestQueueNeverExposesPayloadOrRecipient(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	id := s.notificationOf(t, f.statusID)
	s.markTerminal(t, id, "FAILED", "provider rejected the address")

	resp := f.adminClient.get("/ops/queue?scope=failures")
	requireStatus(t, resp, http.StatusOK, "reading the queue diagnostics")
	for _, field := range []string{"payload", "payload_json", "recipient_user_id", "registration_status_id"} {
		requireNoBodyField(t, resp, field, "the queue diagnostics")
	}
}

func TestQueueIsAdminOnly(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	for name, acc := range map[string]account{"a member": f.member, "an outsider": f.outsider} {
		requireStatus(t, s.session(t, acc).get("/ops/queue"), http.StatusForbidden,
			"reading the queue diagnostics as "+name)
	}
	requireStatus(t, s.client(t).get("/ops/queue"), http.StatusUnauthorized,
		"reading the queue diagnostics without signing in")
}

func TestQueueRejectsAnUnknownScope(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	resp := f.adminClient.get("/ops/queue?scope=everything")
	requireStatus(t, resp, http.StatusBadRequest, "reading the queue with an unknown scope")
	if code := resp.errorCode(t); code != "validation_failed" {
		t.Fatalf("an unknown scope produced code %q, want validation_failed", code)
	}
}

func TestQueueDefaultsToFailuresAndPaginates(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	id := s.notificationOf(t, f.statusID)
	s.markTerminal(t, id, "FAILED", "provider refused the message")

	implicit := f.adminClient.queue(t, "")
	explicit := f.adminClient.queue(t, "failures")
	if len(implicit.Items) != len(explicit.Items) {
		t.Fatalf("the default scope returned %d rows against %d for failures",
			len(implicit.Items), len(explicit.Items))
	}
	if implicit.Meta.Total < 1 {
		t.Fatalf("the diagnostics reported total %d with a failure present", implicit.Meta.Total)
	}
	if implicit.Meta.PageSize <= 0 {
		t.Fatalf("the diagnostics came back without pagination metadata: %+v", implicit.Meta)
	}
}

func findEntry(t *testing.T, page queuePage, id uuid.UUID) queueEntry {
	t.Helper()
	for _, item := range page.Items {
		if item.ID == id {
			return item
		}
	}
	t.Fatalf("notification %s is missing from the diagnostics: %+v", id, page.Items)
	return queueEntry{}
}
