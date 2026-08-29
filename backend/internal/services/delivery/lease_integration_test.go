//go:build integration

package delivery_test

import (
	"sync"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/models"
)

func TestConcurrentWorkersClaimEachEntryOnce(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	rule := w.addRule(60, 1, nil)
	seed := newRig(t, w, newSender(), newSender())
	seed.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	seed.reconcile()
	_ = rule

	expected := w.countAll()
	if expected != 2 {
		t.Fatalf("expected two due notifications, got %d", expected)
	}

	repo := notification.NewNotifications(w.db)
	const workers = 8
	claimed := make([][]models.Notification, workers)
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			<-start
			list, err := repo.ClaimDue(w.ctx, 20, 2*time.Minute, seed.clock.at)
			if err != nil {
				t.Errorf("worker %d failed to claim: %v", idx, err)
				return
			}
			claimed[idx] = list
		}(i)
	}
	close(start)
	wg.Wait()

	seen := make(map[string]int)
	total := 0
	for _, list := range claimed {
		for _, n := range list {
			seen[n.ID.String()]++
			total++
		}
	}
	if total != expected {
		t.Fatalf("expected %d claims in total, got %d", expected, total)
	}
	for id, count := range seen {
		if count != 1 {
			t.Fatalf("notification %s was claimed %d times", id, count)
		}
	}
}

func TestConcurrentDeliveryRunsSendOnce(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	email := newSender()
	seed := newRig(t, w, newSender(), email)
	seed.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	seed.reconcile()
	expected := w.countAll()

	const workers = 6
	rigs := make([]*rig, workers)
	for i := range rigs {
		rigs[i] = newRig(t, w, newSender(), email)
		rigs[i].clock.at = seed.clock.at
	}

	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := range rigs {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			<-start
			rigs[idx].work()
		}(i)
	}
	close(start)
	wg.Wait()

	if email.count() != expected {
		t.Fatalf("expected %d provider calls in total, got %d", expected, email.count())
	}
	var maxAttempts int
	if err := w.pool.QueryRow(w.ctx,
		`SELECT max(attempt_count) FROM notifications`).Scan(&maxAttempts); err != nil {
		t.Fatalf("reading attempt counts: %v", err)
	}
	if maxAttempts != 1 {
		t.Fatalf("a notification was sent more than once, max attempt_count %d", maxAttempts)
	}
}

func TestExpiredLeaseReturnsEntryToQueueExactlyOnce(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	email := newSender()
	r, n := seedOneDue(t, w, newSender(), email)

	repo := notification.NewNotifications(w.db)
	claimed, err := repo.ClaimDue(w.ctx, 20, w.cfg.Notify.LeaseTTL, r.clock.at)
	if err != nil {
		t.Fatalf("claiming: %v", err)
	}
	if len(claimed) != 1 {
		t.Fatalf("expected one claimed entry, got %d", len(claimed))
	}
	stuck := r.load(n.ID)
	requireStatus(t, stuck, models.NotificationProcessing)
	if stuck.LeaseExpiresAt == nil {
		t.Fatalf("the claim did not set a lease")
	}

	r.recover()
	if got := r.load(n.ID); got.Status != models.NotificationProcessing {
		t.Fatalf("a live lease was recovered too early: %s", got.Status)
	}

	r.clock.Advance(w.cfg.Notify.LeaseTTL + time.Second)
	r.recover()

	returned := r.load(n.ID)
	requireStatus(t, returned, models.NotificationPending)
	if returned.LeaseExpiresAt != nil {
		t.Fatalf("recovery left a lease behind")
	}
	if returned.ProviderCallStartedAt != nil {
		t.Fatalf("recovery left provider_call_started_at behind")
	}
	requireAttempts(t, returned, 0)

	r.work()
	final := r.load(n.ID)
	requireStatus(t, final, models.NotificationSent)
	requireAttempts(t, final, 1)
	if email.count() != 1 {
		t.Fatalf("expected exactly one provider call after recovery, got %d", email.count())
	}
}
