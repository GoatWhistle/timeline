//go:build integration

package authz_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"
)

type queueEntry struct {
	ID               uuid.UUID `json:"id"`
	NotificationType string    `json:"notification_type"`
	Status           string    `json:"status"`
	RequestedChannel string    `json:"requested_channel"`
	ActualChannel    *string   `json:"actual_channel"`
	FailedChannels   []string  `json:"failed_channels"`
	AttemptCount     int       `json:"attempt_count"`
	LeaseExpiresAt   *string   `json:"lease_expires_at"`
	LeaseOverdueS    *float64  `json:"lease_overdue_seconds"`
	LastError        *string   `json:"last_error"`
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

func (c *client) queue(t *testing.T, scope string) queuePage {
	t.Helper()
	path := "/ops/queue"
	if scope != "" {
		path += "?scope=" + scope
	}
	resp := c.get(path)
	requireStatus(t, resp, http.StatusOK, "reading the queue diagnostics")
	var page queuePage
	resp.decode(t, &page)
	return page
}

func (s *stack) notificationOf(t *testing.T, statusID uuid.UUID) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT id FROM notifications WHERE registration_status_id = $1 ORDER BY created_at LIMIT 1`,
		statusID).Scan(&id); err != nil {
		t.Fatalf("the assignment of %s produced no notification to work with: %v", statusID, err)
	}
	return id
}

func (s *stack) markTerminal(t *testing.T, id uuid.UUID, status, reason string) {
	t.Helper()
	if _, err := s.db.Pool().Exec(context.Background(), `
		UPDATE notifications SET
			status = $2, last_error = $3, attempt_count = 4,
			actual_channel = 'EMAIL', failed_channels = ARRAY['EMAIL']::text[],
			next_attempt_at = NULL, lease_expires_at = NULL
		WHERE id = $1`, id, status, reason); err != nil {
		t.Fatalf("driving notification %s to %s: %v", id, status, err)
	}
}

func (s *stack) expireLease(t *testing.T, id uuid.UUID) {
	t.Helper()
	if _, err := s.db.Pool().Exec(context.Background(), `
		UPDATE notifications SET
			status = 'PROCESSING',
			lease_expires_at = now() - interval '7 minutes',
			provider_call_started_at = NULL
		WHERE id = $1`, id); err != nil {
		t.Fatalf("expiring the lease of notification %s: %v", id, err)
	}
}

func (s *stack) notificationStatus(t *testing.T, id uuid.UUID) string {
	t.Helper()
	var status string
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT status FROM notifications WHERE id = $1`, id).Scan(&status); err != nil {
		t.Fatalf("reading the status of notification %s: %v", id, err)
	}
	return status
}
