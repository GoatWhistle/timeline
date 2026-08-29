//go:build integration

package personal_test

import (
	"context"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestRetrospectiveReminderOnlyFollowsAnEventTwoDaysGone(t *testing.T) {
	r := newReminderStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := r.user(t)
	finished := r.event(t, now.Add(-96*time.Hour), now.Add(-72*time.Hour))
	fresh := r.event(t, now.Add(-24*time.Hour), now.Add(-time.Hour))
	r.assign(t, owner, finished)
	r.assign(t, owner, fresh)

	notifyBefore := r.count(t, "notifications")

	result, err := r.svc.Run(ctx)
	if err != nil {
		t.Fatalf("running the reminder pass: %v", err)
	}
	if result.Retrospectives != 1 {
		t.Fatalf("emitted %d retrospective reminders, want 1 for the event that ended two days ago",
			result.Retrospectives)
	}
	if after := r.count(t, "notifications"); after != notifyBefore {
		t.Fatalf("a retrospective reminder queued %d notifications, specification 5.4 forbids any",
			after-notifyBefore)
	}
}

func TestRetrospectiveReminderIsNotRepeated(t *testing.T) {
	r := newReminderStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := r.user(t)
	finished := r.event(t, now.Add(-96*time.Hour), now.Add(-72*time.Hour))
	r.assign(t, owner, finished)

	for i := 0; i < 3; i++ {
		if _, err := r.svc.Run(ctx); err != nil {
			t.Fatalf("reminder pass %d: %v", i, err)
		}
	}
	if got := len(r.events(t, models.EventPersonalRetrospectiveDue)); got != 1 {
		t.Fatalf("three passes produced %d retrospective reminders, want 1", got)
	}
}

func TestWrittenRetrospectiveSuppressesTheReminder(t *testing.T) {
	r := newReminderStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := r.user(t)
	finished := r.event(t, now.Add(-96*time.Hour), now.Add(-72*time.Hour))
	r.assign(t, owner, finished)

	if _, err := r.db.Pool().Exec(ctx, `
		INSERT INTO participant_retrospectives (user_id, event_id, went_well)
		VALUES ($1, $2, 'the demo held together')`, owner, finished); err != nil {
		t.Fatalf("writing the retrospective: %v", err)
	}

	result, err := r.svc.Run(ctx)
	if err != nil {
		t.Fatalf("running the reminder pass: %v", err)
	}
	if result.Retrospectives != 0 {
		t.Fatalf("a written retrospective still produced %d reminders, want 0",
			result.Retrospectives)
	}
}

func TestInactiveOwnerReceivesNoReminder(t *testing.T) {
	r := newReminderStack(t)
	ctx := context.Background()
	now := time.Now().UTC()

	owner := r.user(t)
	eventID := r.event(t, now.Add(-24*time.Hour), now.Add(24*time.Hour))
	r.task(t, owner, eventID, now.Add(-time.Minute))
	if _, err := r.db.Pool().Exec(ctx,
		`UPDATE users SET is_active = false WHERE id = $1`, owner); err != nil {
		t.Fatalf("deactivating the owner: %v", err)
	}

	result, err := r.svc.Run(ctx)
	if err != nil {
		t.Fatalf("running the reminder pass: %v", err)
	}
	if result.Tasks != 0 {
		t.Fatalf("a deactivated owner received %d reminders, want 0", result.Tasks)
	}
}
