//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"
)

type transitionEvent struct {
	ID          string  `json:"id"`
	State       string  `json:"state"`
	PublishedAt *string `json:"published_at"`
	ArchivedAt  *string `json:"archived_at"`
	EndAt       string  `json:"end_at"`
	Title       string  `json:"title"`
}

type transitionRegistration struct {
	ID                string `json:"id"`
	State             string `json:"state"`
	URL               string `json:"url"`
	DeadlineAt        string `json:"deadline_at"`
	ScheduleVersion   int    `json:"schedule_version"`
	ActivationVersion int    `json:"activation_version"`
	ContentVersion    int    `json:"notification_content_version"`
}

type transitionStatus struct {
	ID           string  `json:"id"`
	Status       string  `json:"status"`
	TodoCycle    int     `json:"todo_cycle"`
	RegisteredAt *string `json:"registered_at"`
}

func requireErrorCode(t *testing.T, resp response, wantStatus int, wantCode, what string) {
	t.Helper()
	requireStatus(t, resp, wantStatus, what)
	if code := resp.errorCode(t); code != wantCode {
		t.Fatalf("%s: expected error code %q, got %q, body %s", what, wantCode, code, resp.Body)
	}
}

func (c *client) archive(t *testing.T, id string) response {
	t.Helper()
	return c.post("/admin/events/"+id+"/archive", nil)
}

func (c *client) eventState(t *testing.T, id string) transitionEvent {
	t.Helper()
	resp := c.get("/admin/events/" + id)
	requireStatus(t, resp, http.StatusOK, "reading event "+id)
	var body transitionEvent
	resp.decode(t, &body)
	return body
}

func (c *client) registrationState(t *testing.T, eventID string) transitionRegistration {
	t.Helper()
	resp := c.get("/admin/events/" + eventID + "/registration")
	requireStatus(t, resp, http.StatusOK, "reading the registration of "+eventID)
	var body transitionRegistration
	resp.decode(t, &body)
	return body
}

func (c *client) setStatus(t *testing.T, statusID string, value string) response {
	t.Helper()
	return c.patch("/admin/registration-statuses/"+statusID, map[string]any{"status": value})
}

func (c *client) forceStatus(t *testing.T, statusID string, value string) transitionStatus {
	t.Helper()
	resp := c.setStatus(t, statusID, value)
	requireStatus(t, resp, http.StatusOK, "moving the status to "+value)
	var body transitionStatus
	resp.decode(t, &body)
	return body
}

func (s *stack) participationStatus(t *testing.T, participantID string) string {
	t.Helper()
	var value string
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT participation_status FROM event_participants WHERE display_id = $1`, participantID).Scan(&value); err != nil {
		t.Fatalf("reading the participation status of %s: %v", participantID, err)
	}
	return value
}

func (s *stack) statusRow(t *testing.T, statusID string) transitionStatus {
	t.Helper()
	row := transitionStatus{ID: statusID}
	var registeredAt *string
	if err := s.db.Pool().QueryRow(context.Background(), `
		SELECT status, todo_cycle, to_char(registered_at, 'YYYY-MM-DD"T"HH24:MI:SSZ')
		FROM registration_statuses WHERE display_id = $1`, statusID).
		Scan(&row.Status, &row.TodoCycle, &registeredAt); err != nil {
		t.Fatalf("reading the registration status %s: %v", statusID, err)
	}
	row.RegisteredAt = registeredAt
	return row
}

func (s *stack) notificationCount(t *testing.T, eventID string, state string) int {
	t.Helper()
	var count int
	if err := s.db.Pool().QueryRow(context.Background(), `
		SELECT count(*) FROM notifications n
		JOIN registration_statuses rs ON rs.id = n.registration_status_id
		WHERE rs.event_id = (SELECT id FROM events WHERE display_id = $1)
		   AND n.status = $2`, eventID, state).Scan(&count); err != nil {
		t.Fatalf("counting %s notifications of %s: %v", state, eventID, err)
	}
	return count
}

func (f fixture) seedPending(t *testing.T, s *stack) {
	t.Helper()
	requireStatus(t, f.adminClient.post("/admin/events/"+f.eventID+"/registration/disable", nil),
		http.StatusOK, "disabling the registration to clear the queue")
	requireStatus(t, f.adminClient.post("/admin/events/"+f.eventID+"/registration/enable", nil),
		http.StatusOK, "enabling the registration to raise a primary notification")
	if pending := s.pendingForStatus(t, f.statusID); pending == 0 {
		t.Fatalf("reactivating the registration raised no pending notification")
	}
}

func (s *stack) pendingForStatus(t *testing.T, statusID string) int {
	t.Helper()
	var count int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM notifications
		 WHERE registration_status_id = (SELECT id FROM registration_statuses WHERE display_id = $1)
		   AND status = 'PENDING'`,
		statusID).Scan(&count); err != nil {
		t.Fatalf("counting pending notifications of status %s: %v", statusID, err)
	}
	return count
}

func (s *stack) userIsActive(t *testing.T, userID string) bool {
	t.Helper()
	var active bool
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT is_active FROM users WHERE display_id = $1`, userID).Scan(&active); err != nil {
		t.Fatalf("reading the activity flag of %s: %v", userID, err)
	}
	return active
}
