//go:build integration

package delivery_test

import (
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestOverdueSwitchCreatesOneNotificationAfterTheLead(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	w.wantOverdue(true)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(61 * time.Minute)

	result := r.reconcile()
	if result.Overdue != 1 {
		t.Fatalf("expected one overdue notification, got %+v", result)
	}
	key := r.overdueKey(models.ChannelTelegram)
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

func TestOverdueDoesNotFireBeforeTheLeadElapses(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	w.wantOverdue(true)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(30 * time.Minute)

	result := r.reconcile()
	if result.Overdue != 0 {
		t.Fatalf("the overdue notice fired before its trigger moment: %+v", result)
	}
}

func TestOverdueDoesNotFireAfterEventEnd(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	w.wantOverdue(true)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.EventEndAt.Add(time.Minute)

	result := r.reconcile()
	if result.Overdue != 0 {
		t.Fatalf("the overdue notice fired after the event end: %+v", result)
	}
}

func TestOverdueSkipsDoneParticipant(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	w.wantOverdue(true)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(61 * time.Minute)
	w.setStatus(models.StatusDONE)

	result := r.reconcile()
	if result.Overdue != 0 {
		t.Fatalf("a DONE participant received an overdue notification: %+v", result)
	}
	if got := w.countAll(); got != 0 {
		t.Fatalf("expected no notifications, got %d", got)
	}
}

func TestReminderNotCreatedAfterDeadline(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	w.wantReminder(1)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(time.Minute)

	result := r.reconcile()
	if result.Reminder != 0 {
		t.Fatalf("a pre-deadline reminder was created after the deadline: %+v", result)
	}
}

func TestReminderCreatedImmediatelyWhenTheDayWasChosenLate(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	w.wantReminder(1)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	result := r.reconcile()
	if result.Reminder != 1 {
		t.Fatalf("expected an immediate reminder for a day chosen late, got %+v", result)
	}
	n := r.byKey(r.reminderKey(1, models.ChannelTelegram))
	if n.ScheduledAt.After(r.clock.at) {
		t.Fatalf("scheduled_at must be the trigger moment, got %v", n.ScheduledAt)
	}
}

func TestAnEmptyScheduleFiresNothing(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	result := r.reconcile()
	if result.Reminder != 0 {
		t.Fatalf("an empty schedule produced a reminder: %+v", result)
	}
}
