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
	w.clearSchedule()
	w.wantReminder(1)
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

	reminderKey := base.reminderKey(1, models.ChannelTelegram)
	if got := w.countByKey(reminderKey); got != 1 {
		t.Fatalf("expected exactly one reminder for %s, got %d", reminderKey, got)
	}
	if got := w.countByKey(base.primaryKey(models.ChannelTelegram)); got != 1 {
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
	w.clearSchedule()
	w.wantReminder(1)
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
}

func TestDoneBeforeSchedulerSuppressesCreation(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	w.wantReminder(1)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	w.setStatus(models.StatusDONE)

	result := r.reconcile()
	if result.Primary != 0 || result.Reminder != 0 || result.Overdue != 0 {
		t.Fatalf("a DONE status still produced registration notifications: %+v", result)
	}
	if got := w.countAll(); got != 0 {
		t.Fatalf("expected no notifications, got %d (%v)", got, w.keys())
	}
}
