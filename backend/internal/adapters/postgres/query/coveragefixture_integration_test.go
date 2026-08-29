//go:build integration

package query_test

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type coverageFixture struct {
	t    *testing.T
	pool *pgxpool.Pool
	now  time.Time
}

func newCoverageFixture(t *testing.T, pool *pgxpool.Pool) *coverageFixture {
	t.Helper()
	return &coverageFixture{t: t, pool: pool, now: time.Now().UTC().Truncate(time.Second)}
}

func (f *coverageFixture) event(title string, published, archived bool) string {
	f.t.Helper()
	var id string
	var publishedAt, archivedAt *time.Time
	if published {
		at := f.now.Add(-24 * time.Hour)
		publishedAt = &at
	}
	if archived {
		at := f.now.Add(-time.Hour)
		archivedAt = &at
	}
	err := f.pool.QueryRow(context.Background(), `
		INSERT INTO events (title, start_at, end_at, published_at, archived_at)
		VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		title, f.now, f.now.Add(72*time.Hour), publishedAt, archivedAt).Scan(&id)
	if err != nil {
		f.t.Fatalf("creating event %q: %v", title, err)
	}
	return id
}

func (f *coverageFixture) registration(eventID, state string) string {
	f.t.Helper()
	var id string
	err := f.pool.QueryRow(context.Background(), `
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at, state)
		VALUES ($1, 'https://example.com/register', $2, $3, $4) RETURNING id`,
		eventID, f.now.Add(24*time.Hour), f.now.Add(72*time.Hour), state).Scan(&id)
	if err != nil {
		f.t.Fatalf("creating registration: %v", err)
	}
	return id
}

func (f *coverageFixture) user(email string, active bool, deleted bool) string {
	f.t.Helper()
	var id string
	var deletedAt *time.Time
	if deleted {
		at := f.now.Add(-time.Hour)
		deletedAt = &at
	}
	err := f.pool.QueryRow(context.Background(), `
		INSERT INTO users (first_name, last_name, email, password_hash, email_verified_at, is_active, deleted_at)
		VALUES ('Test', 'Participant', $1, 'hash', now(), $2, $3) RETURNING id`,
		email, active, deletedAt).Scan(&id)
	if err != nil {
		f.t.Fatalf("creating user %q: %v", email, err)
	}
	return id
}

func (f *coverageFixture) participant(eventID, userID, participation string) string {
	f.t.Helper()
	var id string
	var removedAt *time.Time
	if participation == "REMOVED" {
		at := f.now.Add(-time.Hour)
		removedAt = &at
	}
	err := f.pool.QueryRow(context.Background(), `
		INSERT INTO event_participants (event_id, user_id, participation_status, removed_at)
		VALUES ($1, $2, $3, $4) RETURNING id`, eventID, userID, participation, removedAt).Scan(&id)
	if err != nil {
		f.t.Fatalf("creating participant: %v", err)
	}
	return id
}

func (f *coverageFixture) status(eventID, registrationID, participantID, value string) {
	f.t.Helper()
	var registeredAt *time.Time
	if value == "DONE" {
		at := f.now.Add(-time.Minute)
		registeredAt = &at
	}
	_, err := f.pool.Exec(context.Background(), `
		INSERT INTO registration_statuses (event_id, registration_id, participant_id, status, registered_at)
		VALUES ($1, $2, $3, $4, $5)`, eventID, registrationID, participantID, value, registeredAt)
	if err != nil {
		f.t.Fatalf("creating status %q: %v", value, err)
	}
}

func (f *coverageFixture) assign(eventID, registrationID, email, statusValue string) {
	f.t.Helper()
	userID := f.user(email, true, false)
	participantID := f.participant(eventID, userID, "ASSIGNED")
	f.status(eventID, registrationID, participantID, statusValue)
}
