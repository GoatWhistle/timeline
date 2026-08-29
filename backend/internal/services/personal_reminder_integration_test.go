//go:build integration

package services_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/personal"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type reminderStack struct {
	db  *postgres.DB
	svc *services.PersonalReminderService
}

func newReminderStack(t *testing.T) *reminderStack {
	t.Helper()
	db := testsupport.DB(t)
	feed := services.NewSystemEventService(db, systemevent.NewEvents(db))
	limits := config.Personal{
		MaxNoteLength:      20000,
		TaskReminderLead:   time.Hour,
		TaskReminderGrace:  7 * 24 * time.Hour,
		RetrospectiveDelay: 48 * time.Hour,
		RetrospectiveGrace: 14 * 24 * time.Hour,
		ReminderBatch:      200,
	}
	return &reminderStack{db: db, svc: services.NewPersonalReminderService(
		personal.NewReminders(db), feed, limits)}
}

func (r *reminderStack) user(t *testing.T) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := r.db.Pool().QueryRow(context.Background(), `
		INSERT INTO users (display_name, email, password_hash, email_verified_at)
		VALUES ('Owner', $1, 'hash', now()) RETURNING id`,
		"owner-"+uuid.NewString()+"@example.com").Scan(&id)
	if err != nil {
		t.Fatalf("creating a user: %v", err)
	}
	return id
}

func (r *reminderStack) event(t *testing.T, start, end time.Time) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := r.db.Pool().QueryRow(context.Background(), `
		INSERT INTO events (title, start_at, end_at, published_at, format, origin, kind)
		VALUES ('Demo Day', $1, $2, now(), 'ONLINE', 'RU', 'HACKATHON') RETURNING id`,
		start, end).Scan(&id)
	if err != nil {
		t.Fatalf("creating an event: %v", err)
	}
	return id
}

func (r *reminderStack) task(t *testing.T, userID, eventID uuid.UUID, dueAt time.Time) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := r.db.Pool().QueryRow(context.Background(), `
		INSERT INTO participant_tasks (user_id, event_id, title, due_at)
		VALUES ($1, $2, 'Record the demo', $3) RETURNING id`,
		userID, eventID, dueAt).Scan(&id)
	if err != nil {
		t.Fatalf("creating a task: %v", err)
	}
	return id
}

func (r *reminderStack) assign(t *testing.T, userID, eventID uuid.UUID) {
	t.Helper()
	_, err := r.db.Pool().Exec(context.Background(), `
		INSERT INTO event_participants (event_id, user_id, participation_status)
		VALUES ($1, $2, 'ASSIGNED')`, eventID, userID)
	if err != nil {
		t.Fatalf("assigning the participant: %v", err)
	}
}

func (r *reminderStack) count(t *testing.T, table string) int64 {
	t.Helper()
	var total int64
	if err := r.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM `+table).Scan(&total); err != nil {
		t.Fatalf("counting %s: %v", table, err)
	}
	return total
}

func (r *reminderStack) events(t *testing.T, eventType models.SystemEventType) []uuid.UUID {
	t.Helper()
	rows, err := r.db.Pool().Query(context.Background(), `
		SELECT audience_user_id FROM system_events
		WHERE event_type = $1 AND audience_kind = 'USER'`, string(eventType))
	if err != nil {
		t.Fatalf("reading system events: %v", err)
	}
	defer rows.Close()
	var owners []uuid.UUID
	for rows.Next() {
		var owner uuid.UUID
		if err := rows.Scan(&owner); err != nil {
			t.Fatalf("scanning a system event: %v", err)
		}
		owners = append(owners, owner)
	}
	return owners
}

func TestDueTaskEmitsBusEventAndNeverQueuesNotification(t *testing.T) {
	r := newReminderStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := r.user(t)
	eventID := r.event(t, now.Add(-24*time.Hour), now.Add(24*time.Hour))
	r.task(t, owner, eventID, now.Add(-time.Minute))

	notifyBefore := r.count(t, "notifications")
	auditBefore := r.count(t, "audit_log")

	result, err := r.svc.Run(ctx)
	if err != nil {
		t.Fatalf("running the reminder pass: %v", err)
	}
	if result.Tasks != 1 {
		t.Fatalf("emitted %d task reminders, want 1", result.Tasks)
	}

	owners := r.events(t, models.EventPersonalTaskDue)
	if len(owners) != 1 || owners[0] != owner {
		t.Fatalf("the reminder is addressed to %v, want the single owner %s", owners, owner)
	}
	if after := r.count(t, "notifications"); after != notifyBefore {
		t.Fatalf("a personal task queued %d notifications, specification 5.4 forbids any",
			after-notifyBefore)
	}
	if after := r.count(t, "audit_log"); after != auditBefore {
		t.Fatalf("a personal task wrote %d audit rows, specification 5.4 forbids any",
			after-auditBefore)
	}
}

func TestDueTaskReminderIsEmittedOncePerDeadline(t *testing.T) {
	r := newReminderStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := r.user(t)
	eventID := r.event(t, now.Add(-24*time.Hour), now.Add(24*time.Hour))
	taskID := r.task(t, owner, eventID, now.Add(-time.Minute))

	for i := 0; i < 3; i++ {
		if _, err := r.svc.Run(ctx); err != nil {
			t.Fatalf("reminder pass %d: %v", i, err)
		}
	}
	if got := len(r.events(t, models.EventPersonalTaskDue)); got != 1 {
		t.Fatalf("three passes over one deadline produced %d reminders, want 1", got)
	}

	moved := now.Add(30 * time.Minute)
	if _, err := r.db.Pool().Exec(ctx,
		`UPDATE participant_tasks SET due_at = $2 WHERE id = $1`, taskID, moved); err != nil {
		t.Fatalf("moving the deadline: %v", err)
	}
	if _, err := r.svc.Run(ctx); err != nil {
		t.Fatalf("reminder pass after moving the deadline: %v", err)
	}
	if got := len(r.events(t, models.EventPersonalTaskDue)); got != 2 {
		t.Fatalf("a moved deadline produced %d reminders in total, want 2", got)
	}
}

func TestCompletedTaskProducesNoReminder(t *testing.T) {
	r := newReminderStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := r.user(t)
	eventID := r.event(t, now.Add(-24*time.Hour), now.Add(24*time.Hour))
	taskID := r.task(t, owner, eventID, now.Add(-time.Minute))
	if _, err := r.db.Pool().Exec(ctx,
		`UPDATE participant_tasks SET done_at = now() WHERE id = $1`, taskID); err != nil {
		t.Fatalf("completing the task: %v", err)
	}

	result, err := r.svc.Run(ctx)
	if err != nil {
		t.Fatalf("running the reminder pass: %v", err)
	}
	if result.Tasks != 0 {
		t.Fatalf("a completed task produced %d reminders, want 0", result.Tasks)
	}
}
