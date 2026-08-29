//go:build integration

package notification_test

import (
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestOverdueRuleCreatesOneNotificationAfterDeadline(t *testing.T) {
	w := newWorld(t)
	rule := w.addRule(-60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(61 * time.Minute)

	result := r.reconcile()
	if result.Overdue != 1 {
		t.Fatalf("expected one overdue notification, got %+v", result)
	}
	key := r.ruleKey(models.NotificationOverdue, rule)
	if !strings.HasPrefix(key, "overdue:") {
		t.Fatalf("expected an overdue logical key, got %s", key)
	}
	n := r.byKey(key)
	if n.NotificationType != models.NotificationOverdue {
		t.Fatalf("expected REGISTRATION_OVERDUE, got %s", n.NotificationType)
	}

	again := r.reconcile()
	if again.Overdue != 0 {
		t.Fatalf("a repeated pass created a duplicate overdue notification: %+v", again)
	}
	if got := w.countByKey(key); got != 1 {
		t.Fatalf("expected exactly one overdue row, got %d", got)
	}
}

func TestOverdueRuleDoesNotFireBeforeTrigger(t *testing.T) {
	w := newWorld(t)
	w.addRule(-60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(30 * time.Minute)

	result := r.reconcile()
	if result.Overdue != 0 {
		t.Fatalf("the overdue rule fired before its trigger moment: %+v", result)
	}
}

func TestOverdueRuleDoesNotFireAfterEventEnd(t *testing.T) {
	w := newWorld(t)
	w.addRule(-60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.EventEndAt.Add(time.Minute)

	result := r.reconcile()
	if result.Overdue != 0 {
		t.Fatalf("the overdue rule fired after the event end: %+v", result)
	}
}

func TestOverdueRuleSkipsDoneParticipant(t *testing.T) {
	w := newWorld(t)
	w.addRule(-60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(61 * time.Minute)
	w.setStatus(models.StatusDONE)

	result := r.reconcile()
	if result.Scanned != 0 || result.Overdue != 0 {
		t.Fatalf("a DONE participant received an overdue notification: %+v", result)
	}
	if got := w.countAll(); got != 0 {
		t.Fatalf("expected no notifications, got %d", got)
	}
}

func TestReminderNotCreatedAfterDeadline(t *testing.T) {
	w := newWorld(t)
	w.addRule(60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(time.Minute)

	result := r.reconcile()
	if result.Reminder != 0 {
		t.Fatalf("a pre-deadline reminder was created after the deadline: %+v", result)
	}
}

func TestReminderCreatedImmediatelyWhenRuleAddedLate(t *testing.T) {
	w := newWorld(t)
	rule := w.addRule(120, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	result := r.reconcile()
	if result.Reminder != 1 {
		t.Fatalf("expected an immediate reminder for a late rule, got %+v", result)
	}
	n := r.byKey(r.ruleKey(models.NotificationReminder, rule))
	if n.ScheduledAt.After(r.clock.at) {
		t.Fatalf("scheduled_at must be the trigger moment, got %v", n.ScheduledAt)
	}
}

func TestDisabledRuleDoesNotFire(t *testing.T) {
	w := newWorld(t)
	rule := w.addRule(60, 1, nil)
	w.exec(`UPDATE notification_rules SET enabled = false WHERE id = $1`, rule)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	result := r.reconcile()
	if result.Reminder != 0 {
		t.Fatalf("a disabled rule fired: %+v", result)
	}
}
