//go:build integration

package postgres_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestDeadlineNotAfterEventEnd(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	event := insertEvent(t, pool, start, start.Add(48*time.Hour))

	_, err := pool.Exec(ctx, `
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at)
		VALUES ($1, 'https://example.com/reg', $2, $3)`,
		event, start.Add(72*time.Hour), start.Add(48*time.Hour))
	requireConstraint(t, err, "registrations_deadline_within_event")

	if _, err := pool.Exec(ctx, `
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at)
		VALUES ($1, 'https://example.com/reg', $2, $3)`,
		event, start.Add(24*time.Hour), start.Add(48*time.Hour)); err != nil {
		t.Fatalf("creating registration: %v", err)
	}

	_, err = pool.Exec(ctx, `UPDATE events SET end_at = $2 WHERE id = $1`,
		event, start.Add(12*time.Hour))
	requireConstraint(t, err, "registrations_deadline_within_event")

	if _, err := pool.Exec(ctx, `UPDATE events SET end_at = $2 WHERE id = $1`,
		event, start.Add(96*time.Hour)); err != nil {
		t.Fatalf("moving event end: %v", err)
	}
	var copied time.Time
	if err := pool.QueryRow(ctx, `SELECT event_end_at FROM registrations WHERE event_id = $1`, event).
		Scan(&copied); err != nil {
		t.Fatalf("reading the copied end: %v", err)
	}
	if !copied.UTC().Equal(start.Add(96 * time.Hour)) {
		t.Fatalf("the copied end was not cascaded: %v", copied)
	}
}

func TestStatusCrossEventIntegrity(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)

	first := insertEvent(t, pool, start, start.Add(48*time.Hour))
	second := insertEvent(t, pool, start, start.Add(48*time.Hour))
	user := insertUser(t, pool, "cross@example.com")

	registration := insertRegistration(t, pool, first, start.Add(24*time.Hour), start.Add(48*time.Hour))
	foreignParticipant := insertParticipant(t, pool, second, user)

	_, err := pool.Exec(ctx, `
		INSERT INTO registration_statuses (event_id, registration_id, participant_id)
		VALUES ($1, $2, $3)`, first, registration, foreignParticipant)
	if err == nil {
		t.Fatal("status linked a registration and a participant from different events")
	}
	requireConstraint(t, err, "statuses_participant_fk")
}

func TestReminderScheduleAcceptsOnlyKnownOccasionsAndDays(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	_, userID := seedStatus(t, pool)

	if _, err := pool.Exec(ctx, `
		INSERT INTO user_reminder_schedule (user_id, occasion, days_before)
		VALUES ($1, 'REMINDER_EVENT_START', 7) ON CONFLICT DO NOTHING`, userID); err != nil {
		t.Fatalf("storing a valid schedule row: %v", err)
	}

	_, err := pool.Exec(ctx, `
		INSERT INTO user_reminder_schedule (user_id, occasion, days_before)
		VALUES ($1, 'REMINDER_EVENT_START', 5)`, userID)
	requireConstraint(t, err, "user_reminder_schedule_days_enum")

	_, err = pool.Exec(ctx, `
		INSERT INTO user_reminder_schedule (user_id, occasion, days_before)
		VALUES ($1, 'REGISTRATION_REQUIRED', 7)`, userID)
	requireConstraint(t, err, "user_reminder_schedule_occasion_enum")
}

func TestReminderScheduleVersionStaysPositive(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	_, userID := seedStatus(t, pool)

	_, err := pool.Exec(ctx,
		`UPDATE users SET reminder_schedule_version = 0 WHERE id = $1`, userID)
	requireConstraint(t, err, "users_reminder_schedule_version_positive")
}

func TestNotificationLogicalKeyUnique(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	statusID, userID := seedStatus(t, pool)

	insert := `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			assignment_version, activation_version, notification_content_version,
			logical_key, requested_channel, scheduled_at, next_attempt_at)
		VALUES ('REGISTRATION_REQUIRED', $1, $2, 1, 1, 1, $3, 'EMAIL', now(), now())`

	key := "required:" + statusID + ":av1:rv1:cv1"
	if _, err := pool.Exec(ctx, insert, userID, statusID, key); err != nil {
		t.Fatalf("creating notification: %v", err)
	}
	_, err := pool.Exec(ctx, insert, userID, statusID, key)
	requireConstraint(t, err, "notifications_logical_key_key")

	tag, err := pool.Exec(ctx, insert+" ON CONFLICT (logical_key) DO NOTHING", userID, statusID, key)
	if err != nil {
		t.Fatalf("idempotent insert: %v", err)
	}
	if tag.RowsAffected() != 0 {
		t.Fatalf("expected 0 inserted rows, got %d", tag.RowsAffected())
	}
}

func TestNotificationVersionsByType(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	statusID, userID := seedStatus(t, pool)

	_, err := pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			notification_content_version, logical_key, requested_channel, scheduled_at)
		VALUES ('REGISTRATION_REQUIRED', $1, $2, 1, 'required:no-versions', 'EMAIL', now())`,
		userID, statusID)
	requireConstraint(t, err, "notifications_versions_by_type")

	_, err = pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			notification_content_version, logical_key, requested_channel, scheduled_at)
		VALUES ('REMINDER_REGISTRATION_DEADLINE', $1, $2, 1, 'reminder:no-versions', 'EMAIL', now())`,
		userID, statusID)
	requireConstraint(t, err, "notifications_versions_by_type")
}

func TestNotificationRowsCannotBeDeleted(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	statusID, userID := seedStatus(t, pool)

	if _, err := pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			assignment_version, activation_version, notification_content_version,
			logical_key, requested_channel, scheduled_at, payload_json)
		VALUES ('REGISTRATION_REQUIRED', $1, $2, 1, 1, 1, 'required:retention', 'EMAIL', now(), '{"a":1}')`,
		userID, statusID); err != nil {
		t.Fatalf("creating notification: %v", err)
	}

	if _, err := pool.Exec(ctx, `DELETE FROM notifications WHERE logical_key = 'required:retention'`); err == nil {
		t.Fatal("deleting a notification row must be forbidden")
	}

	if _, err := pool.Exec(ctx, `UPDATE notifications SET payload_json = NULL WHERE logical_key = 'required:retention'`); err != nil {
		t.Fatalf("payload cleanup: %v", err)
	}
	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM notifications WHERE logical_key = 'required:retention'`).Scan(&count); err != nil {
		t.Fatalf("reading notification: %v", err)
	}
	if count != 1 {
		t.Fatalf("the notification row must be preserved, found %d", count)
	}
}

func TestAuditLogImmutable(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()

	if _, err := pool.Exec(ctx, `
		INSERT INTO audit_log (action, entity_type, after_json)
		VALUES ('STATUS_CHANGE', 'REGISTRATION_STATUS', '{"status":"DONE"}')`); err != nil {
		t.Fatalf("creating audit entry: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE audit_log SET action = 'RULE_CHANGE'`); err == nil {
		t.Fatal("modifying an audit entry must be forbidden")
	}
	if _, err := pool.Exec(ctx, `DELETE FROM audit_log`); err == nil {
		t.Fatal("deleting an audit entry must be forbidden")
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("beginning transaction: %v", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SET LOCAL app.audit_retention = 'on'`); err != nil {
		t.Fatalf("enabling retention mode: %v", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM audit_log`); err != nil {
		t.Fatalf("retention cleanup: %v", err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatalf("committing transaction: %v", err)
	}
}

func TestParticipantUniquePerEvent(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	event := insertEvent(t, pool, start, start.Add(48*time.Hour))
	user := insertUser(t, pool, "dup@example.com")

	insertParticipant(t, pool, event, user)
	_, err := pool.Exec(ctx, `
		INSERT INTO event_participants (event_id, user_id, team_role)
		VALUES ($1, $2, 'Developer')`, event, user)
	requireConstraint(t, err, "participants_event_user_key")
}

func TestRegistrationUniquePerEvent(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	event := insertEvent(t, pool, start, start.Add(48*time.Hour))
	insertRegistration(t, pool, event, start.Add(24*time.Hour), start.Add(48*time.Hour))

	_, err := pool.Exec(ctx, `
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at)
		VALUES ($1, 'https://example.com/second', $2, $3)`,
		event, start.Add(12*time.Hour), start.Add(48*time.Hour))
	requireConstraint(t, err, "registrations_event_key")
}

func requireConstraint(t *testing.T, err error, constraint string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected constraint %s to be violated, got no error", constraint)
	}
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		t.Fatalf("expected a PostgreSQL error, got: %v", err)
	}
	if pgErr.ConstraintName != constraint {
		t.Fatalf("expected constraint %s, violated %s (%s)", constraint, pgErr.ConstraintName, pgErr.Message)
	}
}

func insertEvent(t *testing.T, pool *pgxpool.Pool, start, end time.Time) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(), `
		INSERT INTO events (title, start_at, end_at, published_at)
		VALUES ('Test event', $1, $2, now()) RETURNING id`, start, end).Scan(&id)
	if err != nil {
		t.Fatalf("creating event: %v", err)
	}
	return id
}

func insertUser(t *testing.T, pool *pgxpool.Pool, email string) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(), `
		INSERT INTO users (first_name, last_name, email, password_hash, email_verified_at)
		VALUES ('Test', 'User', $1, 'hash', now()) RETURNING id`, email).Scan(&id)
	if err != nil {
		t.Fatalf("creating user: %v", err)
	}
	return id
}

func insertParticipant(t *testing.T, pool *pgxpool.Pool, event, user string) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(), `
		INSERT INTO event_participants (event_id, user_id, team_role)
		VALUES ($1, $2, 'Developer') RETURNING id`, event, user).Scan(&id)
	if err != nil {
		t.Fatalf("creating participant: %v", err)
	}
	return id
}

func insertRegistration(t *testing.T, pool *pgxpool.Pool, event string, deadline, end time.Time) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(), `
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at)
		VALUES ($1, 'https://example.com/reg', $2, $3) RETURNING id`, event, deadline, end).Scan(&id)
	if err != nil {
		t.Fatalf("creating registration: %v", err)
	}
	return id
}

func seedStatus(t *testing.T, pool *pgxpool.Pool) (statusID, userID string) {
	t.Helper()
	start := time.Now().UTC().Truncate(time.Second)
	event := insertEvent(t, pool, start, start.Add(48*time.Hour))
	userID = insertUser(t, pool, "member@example.com")
	participant := insertParticipant(t, pool, event, userID)
	registration := insertRegistration(t, pool, event, start.Add(24*time.Hour), start.Add(48*time.Hour))

	err := pool.QueryRow(context.Background(), `
		INSERT INTO registration_statuses (event_id, registration_id, participant_id)
		VALUES ($1, $2, $3) RETURNING id`, event, registration, participant).Scan(&statusID)
	if err != nil {
		t.Fatalf("creating status: %v", err)
	}
	return statusID, userID
}
