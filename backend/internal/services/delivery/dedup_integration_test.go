//go:build integration

package delivery_test

import (
	"sync"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestConcurrentSchedulersCreateOneNotification(t *testing.T) {
	w := newWorld(t)
	rule := w.addRule(60, 1, nil)
	base := newRig(t, w, newSender(), newSender())
	base.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	const racers = 8
	rigs := make([]*rig, racers)
	for i := range rigs {
		rigs[i] = newRig(t, w, newSender(), newSender())
		rigs[i].clock.at = base.clock.at
	}

	start := make(chan struct{})
	var wg sync.WaitGroup
	created := make([]int, racers)
	for i := range rigs {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			<-start
			result, err := rigs[idx].planner.Run(w.ctx)
			if err != nil {
				t.Errorf("scheduler %d failed: %v", idx, err)
				return
			}
			created[idx] = result.Primary + result.Reminder + result.Overdue
		}(i)
	}
	close(start)
	wg.Wait()

	reminderKey := base.ruleKey(models.NotificationReminder, rule)
	if got := w.countByKey(reminderKey); got != 1 {
		t.Fatalf("expected exactly one reminder for %s, got %d", reminderKey, got)
	}
	if got := w.countByKey(base.primaryKey()); got != 1 {
		t.Fatalf("expected exactly one primary notification, got %d", got)
	}
	if got := w.countAll(); got != 2 {
		t.Fatalf("expected two notifications in total, got %d (%v)", got, w.keys())
	}

	total := 0
	for _, n := range created {
		total += n
	}
	if total != 2 {
		t.Fatalf("expected the racers to report two creations in total, got %d", total)
	}
}

func TestReconciliationIsIdempotentAcrossPasses(t *testing.T) {
	w := newWorld(t)
	rule := w.addRule(60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	first := r.reconcile()
	if first.Primary != 1 || first.Reminder != 1 {
		t.Fatalf("expected one primary and one reminder, got %+v", first)
	}
	second := r.reconcile()
	if second.Primary != 0 || second.Reminder != 0 {
		t.Fatalf("the second pass created notifications again: %+v", second)
	}
	if got := w.countAll(); got != 2 {
		t.Fatalf("expected two notifications, got %d (%v)", got, w.keys())
	}
	_ = rule
}

func TestDoneBeforeSchedulerSuppressesCreation(t *testing.T) {
	w := newWorld(t)
	w.addRule(60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	w.setStatus(models.StatusDONE)

	result := r.reconcile()
	if result.Scanned != 0 {
		t.Fatalf("a DONE status must not be a reconciliation candidate, scanned %d", result.Scanned)
	}
	if got := w.countAll(); got != 0 {
		t.Fatalf("expected no notifications, got %d (%v)", got, w.keys())
	}
}

func TestScheduleVersionBumpProducesNewKey(t *testing.T) {
	w := newWorld(t)
	rule := w.addRule(60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	oldKey := r.ruleKey(models.NotificationReminder, rule)
	old := r.byKey(oldKey)
	requireStatus(t, old, models.NotificationPending)

	sent := r.byKey(r.primaryKey())
	w.exec(`UPDATE notifications SET status = 'SENT', sent_at = now() WHERE id = $1`, sent.ID)

	newDeadline := w.DeadlineAt.Add(2 * time.Hour)
	w.exec(`UPDATE registrations SET deadline_at = $2, schedule_version = schedule_version + 1 WHERE id = $1`,
		w.RegistrationID, newDeadline)
	if err := r.notifier.CancelForRegistration(w.ctx, w.RegistrationID); err != nil {
		t.Fatalf("cancelling on schedule change: %v", err)
	}
	w.DeadlineAt = newDeadline

	requireStatus(t, r.load(old.ID), models.NotificationCancelled)
	requireStatus(t, r.load(sent.ID), models.NotificationSent)

	r.clock.at = newDeadline.Add(-30 * time.Minute)
	result := r.reconcile()
	if result.Reminder != 1 {
		t.Fatalf("expected one reminder for the new schedule version, got %+v", result)
	}
	freshKey := r.ruleKey(models.NotificationReminder, rule)
	if freshKey == oldKey {
		t.Fatalf("the schedule version bump did not change the logical key: %s", freshKey)
	}
	requireStatus(t, r.byKey(freshKey), models.NotificationPending)
}

func TestContentVersionBumpProducesNewKeyAndPayload(t *testing.T) {
	w := newWorld(t)
	rule := w.addRule(60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	oldReminder := r.byKey(r.ruleKey(models.NotificationReminder, rule))
	oldPrimary := r.byKey(r.primaryKey())
	if oldReminder.Payload.RegistrationURL != "https://example.com/reg" {
		t.Fatalf("unexpected snapshot url: %s", oldReminder.Payload.RegistrationURL)
	}

	w.exec(`UPDATE registrations SET url = $2, notification_content_version = notification_content_version + 1
		WHERE id = $1`, w.RegistrationID, "https://example.com/reg-v2")
	if err := r.notifier.CancelForRegistration(w.ctx, w.RegistrationID); err != nil {
		t.Fatalf("cancelling on content change: %v", err)
	}

	requireStatus(t, r.load(oldReminder.ID), models.NotificationCancelled)
	requireStatus(t, r.load(oldPrimary.ID), models.NotificationCancelled)

	result := r.reconcile()
	if result.Primary != 1 || result.Reminder != 1 {
		t.Fatalf("expected fresh notifications of both kinds, got %+v", result)
	}
	fresh := r.byKey(r.ruleKey(models.NotificationReminder, rule))
	if fresh.ID == oldReminder.ID {
		t.Fatalf("the content version bump reused the old notification")
	}
	if fresh.Payload.RegistrationURL != "https://example.com/reg-v2" {
		t.Fatalf("the fresh payload carries the old url: %s", fresh.Payload.RegistrationURL)
	}
	if r.load(oldReminder.ID).Payload.RegistrationURL != "https://example.com/reg" {
		t.Fatalf("the old snapshot was rewritten")
	}
}

func TestTodoCycleBumpProducesNewKey(t *testing.T) {
	w := newWorld(t)
	rule := w.addRule(60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	firstKey := r.ruleKey(models.NotificationReminder, rule)
	first := r.byKey(firstKey)

	w.setStatus(models.StatusDONE)
	if err := r.notifier.CancelForStatus(w.ctx, w.StatusID); err != nil {
		t.Fatalf("cancelling on DONE: %v", err)
	}
	requireStatus(t, r.load(first.ID), models.NotificationCancelled)

	w.setStatus(models.StatusTODO)
	result := r.reconcile()
	if result.Reminder != 1 {
		t.Fatalf("expected one reminder in the new TODO cycle, got %+v", result)
	}
	secondKey := r.ruleKey(models.NotificationReminder, rule)
	if secondKey == firstKey {
		t.Fatalf("the new TODO cycle reused the old logical key: %s", secondKey)
	}
	if got := w.countByKey(secondKey); got != 1 {
		t.Fatalf("expected exactly one notification in the new cycle, got %d", got)
	}
}

func TestAssignmentVersionBumpProducesNewPrimaryKey(t *testing.T) {
	w := newWorld(t)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	firstKey := r.primaryKey()
	first := r.byKey(firstKey)

	w.exec(`UPDATE event_participants SET participation_status = 'REMOVED', removed_at = now(),
		assignment_version = assignment_version + 1 WHERE id = $1`, w.ParticipantID)
	if err := r.notifier.CancelForParticipant(w.ctx, w.ParticipantID); err != nil {
		t.Fatalf("cancelling on removal: %v", err)
	}
	requireStatus(t, r.load(first.ID), models.NotificationCancelled)
	if r.reconcile().Scanned != 0 {
		t.Fatalf("a REMOVED participant must not be a candidate")
	}

	w.exec(`UPDATE event_participants SET participation_status = 'ASSIGNED', removed_at = NULL,
		assignment_version = assignment_version + 1 WHERE id = $1`, w.ParticipantID)

	result := r.reconcile()
	if result.Primary != 1 {
		t.Fatalf("expected a fresh primary notification after reactivation, got %+v", result)
	}
	secondKey := r.primaryKey()
	if secondKey == firstKey {
		t.Fatalf("the assignment version bump did not change the key: %s", secondKey)
	}
}
