//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type queueEntry struct {
	ID               string   `json:"id"`
	NotificationType string   `json:"notification_type"`
	Status           string   `json:"status"`
	RequestedChannel string   `json:"requested_channel"`
	ActualChannel    *string  `json:"actual_channel"`
	FailedChannels   []string `json:"failed_channels"`
	AttemptCount     int      `json:"attempt_count"`
	LeaseExpiresAt   *string  `json:"lease_expires_at"`
	LeaseOverdueS    *float64 `json:"lease_overdue_seconds"`
	LastError        *string  `json:"last_error"`
}

type queueMeta struct {
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
	Total    int64 `json:"total"`
	HasNext  bool  `json:"has_next"`
}

type queuePage struct {
	Items []queueEntry `json:"items"`
	Meta  queueMeta    `json:"meta"`
}

func queue(c *support.Client, t *testing.T, scope string) queuePage {
	t.Helper()
	path := "/ops/queue"
	if scope != "" {
		path += "?scope=" + scope
	}
	resp := c.Get(path)
	support.RequireStatus(t, resp, http.StatusOK, "reading the queue diagnostics")
	var page queuePage
	resp.Decode(t, &page)
	return page
}

func notificationOf(s *support.Stack, t *testing.T, statusID string) string {
	t.Helper()
	var id string
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT display_id FROM notifications
		 WHERE registration_status_id = (SELECT id FROM registration_statuses WHERE display_id = $1)
		 ORDER BY created_at LIMIT 1`,
		statusID).Scan(&id); err != nil {
		t.Fatalf("the assignment of %s produced no notification to work with: %v", statusID, err)
	}
	return id
}

func markTerminal(s *support.Stack, t *testing.T, id string, status, reason string) {
	t.Helper()
	if _, err := s.DB().Pool().Exec(context.Background(), `
		UPDATE notifications SET
			status = $2, last_error = $3, attempt_count = 4,
			actual_channel = 'EMAIL', failed_channels = ARRAY['EMAIL']::text[],
			next_attempt_at = NULL, lease_expires_at = NULL
		WHERE display_id = $1`, id, status, reason); err != nil {
		t.Fatalf("driving notification %s to %s: %v", id, status, err)
	}
}

func expireLease(s *support.Stack, t *testing.T, id string) {
	t.Helper()
	if _, err := s.DB().Pool().Exec(context.Background(), `
		UPDATE notifications SET
			status = 'PROCESSING',
			lease_expires_at = now() - interval '7 minutes',
			provider_call_started_at = NULL
		WHERE display_id = $1`, id); err != nil {
		t.Fatalf("expiring the lease of notification %s: %v", id, err)
	}
}

func notificationStatus(s *support.Stack, t *testing.T, id string) string {
	t.Helper()
	var status string
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT status FROM notifications WHERE display_id = $1`, id).Scan(&status); err != nil {
		t.Fatalf("reading the status of notification %s: %v", id, err)
	}
	return status
}

func TestQueueListsTerminalFailuresWithTheirReason(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	failed := notificationOf(s, t, f.StatusID)
	markTerminal(s, t, failed, "FAILED", "provider refused the message four times")

	page := queue(f.AdminClient, t, "failures")
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
	s := support.NewStack(t)
	f := s.Seed(t)

	id := notificationOf(s, t, f.StatusID)
	markTerminal(s, t, id, "UNDELIVERABLE", "no channel is available for the recipient")

	entry := findEntry(t, queue(f.AdminClient, t, "failures"), id)
	if entry.Status != "UNDELIVERABLE" {
		t.Fatalf("entry status = %q, want UNDELIVERABLE", entry.Status)
	}
}

func TestQueueSeparatesStuckLeasesFromFailures(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	stuck := notificationOf(s, t, f.StatusID)
	expireLease(s, t, stuck)

	leases := queue(f.AdminClient, t, "stuck-leases")
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

	for _, item := range queue(f.AdminClient, t, "failures").Items {
		if item.ID == stuck {
			t.Fatal("a stuck lease was reported among the terminal failures")
		}
	}
}

func TestQueueLeavesTheStuckLeaseAloneAndDoesNotRecoverIt(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	stuck := notificationOf(s, t, f.StatusID)
	expireLease(s, t, stuck)

	queue(f.AdminClient, t, "stuck-leases")
	queue(f.AdminClient, t, "stuck-leases")

	if status := notificationStatus(s, t, stuck); status != "PROCESSING" {
		t.Fatalf("reading the diagnostics moved the entry to %q: the endpoint reports, "+
			"the recovery task of specification section 9.4.9 recovers", status)
	}
	if len(queue(f.AdminClient, t, "stuck-leases").Items) == 0 {
		t.Fatal("the stuck lease vanished from the diagnostics after being read")
	}
}

func TestQueueNeverExposesPayloadOrRecipient(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	id := notificationOf(s, t, f.StatusID)
	markTerminal(s, t, id, "FAILED", "provider rejected the address")

	resp := f.AdminClient.Get("/ops/queue?scope=failures")
	support.RequireStatus(t, resp, http.StatusOK, "reading the queue diagnostics")
	for _, field := range []string{"payload", "payload_json", "recipient_user_id", "registration_status_id"} {
		support.RequireNoBodyField(t, resp, field, "the queue diagnostics")
	}
}

func TestQueueIsAdminOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	for name, acc := range map[string]support.Account{"a member": f.Member, "an outsider": f.Outsider} {
		support.RequireStatus(t, s.Session(t, acc).Get("/ops/queue"), http.StatusForbidden,
			"reading the queue diagnostics as "+name)
	}
	support.RequireStatus(t, s.Client(t).Get("/ops/queue"), http.StatusUnauthorized,
		"reading the queue diagnostics without signing in")
}

func TestQueueRejectsAnUnknownScope(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	resp := f.AdminClient.Get("/ops/queue?scope=everything")
	support.RequireStatus(t, resp, http.StatusBadRequest, "reading the queue with an unknown scope")
	if code := resp.ErrorCode(t); code != "validation_failed" {
		t.Fatalf("an unknown scope produced code %q, want validation_failed", code)
	}
}

func TestQueueDefaultsToFailuresAndPaginates(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	id := notificationOf(s, t, f.StatusID)
	markTerminal(s, t, id, "FAILED", "provider refused the message")

	implicit := queue(f.AdminClient, t, "")
	explicit := queue(f.AdminClient, t, "failures")
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

func findEntry(t *testing.T, page queuePage, id string) queueEntry {
	t.Helper()
	for _, item := range page.Items {
		if item.ID == id {
			return item
		}
	}
	t.Fatalf("notification %s is missing from the diagnostics: %+v", id, page.Items)
	return queueEntry{}
}
