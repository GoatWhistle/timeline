//go:build integration

package notification_test

import (
	"sync"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/models"
)

func TestCancellationBeforeProviderCallWins(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	r, n := seedOneDue(t, w, newSender(), newSender())

	repo := notification.NewNotifications(w.db)
	if _, err := repo.ClaimDue(w.ctx, 20, w.cfg.Notify.LeaseTTL, r.clock.at); err != nil {
		t.Fatalf("claiming: %v", err)
	}
	requireStatus(t, r.load(n.ID), models.NotificationProcessing)

	if err := r.notifier.CancelForStatus(w.ctx, w.StatusID); err != nil {
		t.Fatalf("cancelling: %v", err)
	}
	requireStatus(t, r.load(n.ID), models.NotificationCancelled)

	started, err := repo.StartProviderCall(w.ctx, n.ID, models.ChannelEmail, r.clock.at)
	if err != nil {
		t.Fatalf("starting provider call: %v", err)
	}
	if started {
		t.Fatalf("a cancelled notification must not enter a provider call")
	}
	requireAttempts(t, r.load(n.ID), 0)
}

func TestCancellationAfterProviderCallStartedDoesNotUnsend(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	r, n := seedOneDue(t, w, newSender(), newSender())

	repo := notification.NewNotifications(w.db)
	if _, err := repo.ClaimDue(w.ctx, 20, w.cfg.Notify.LeaseTTL, r.clock.at); err != nil {
		t.Fatalf("claiming: %v", err)
	}
	started, err := repo.StartProviderCall(w.ctx, n.ID, models.ChannelEmail, r.clock.at)
	if err != nil {
		t.Fatalf("starting provider call: %v", err)
	}
	if !started {
		t.Fatalf("the provider call did not start")
	}
	inFlight := r.load(n.ID)
	if inFlight.ProviderCallStartedAt == nil {
		t.Fatalf("provider_call_started_at was not stamped")
	}

	if err := r.notifier.CancelForStatus(w.ctx, w.StatusID); err != nil {
		t.Fatalf("cancelling during the provider call: %v", err)
	}
	requireStatus(t, r.load(n.ID), models.NotificationProcessing)

	if err := repo.MarkCancelled(w.ctx, n.ID, "late cancellation"); err != nil {
		t.Fatalf("direct cancellation: %v", err)
	}
	requireStatus(t, r.load(n.ID), models.NotificationProcessing)

	if err := repo.MarkSent(w.ctx, n.ID, models.ChannelEmail, r.clock.at); err != nil {
		t.Fatalf("marking sent: %v", err)
	}
	final := r.load(n.ID)
	requireStatus(t, final, models.NotificationSent)
	if final.SentAt == nil {
		t.Fatalf("a delivered notification must record sent_at")
	}
}

func TestProviderCallStartsOnlyOnce(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	r, n := seedOneDue(t, w, newSender(), newSender())

	repo := notification.NewNotifications(w.db)
	if _, err := repo.ClaimDue(w.ctx, 20, w.cfg.Notify.LeaseTTL, r.clock.at); err != nil {
		t.Fatalf("claiming: %v", err)
	}

	const racers = 8
	results := make([]bool, racers)
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < racers; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			<-start
			ok, err := repo.StartProviderCall(w.ctx, n.ID, models.ChannelEmail, r.clock.at)
			if err != nil {
				t.Errorf("racer %d failed: %v", idx, err)
				return
			}
			results[idx] = ok
		}(i)
	}
	close(start)
	wg.Wait()

	won := 0
	for _, ok := range results {
		if ok {
			won++
		}
	}
	if won != 1 {
		t.Fatalf("expected exactly one racer to start the provider call, got %d", won)
	}
	requireAttempts(t, r.load(n.ID), 1)
}

func TestRecipientDeactivationCancelsAndBlocksRecreation(t *testing.T) {
	w := newWorld(t)
	w.addRule(60, 1, nil)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	keys := w.keys()
	if len(keys) != 2 {
		t.Fatalf("expected two notifications, got %d", len(keys))
	}

	w.exec(`UPDATE users SET is_active = false, telegram_chat_id = NULL WHERE id = $1`, w.UserID)
	if err := r.notifier.CancelForRecipient(w.ctx, w.UserID); err != nil {
		t.Fatalf("cancelling for the recipient: %v", err)
	}
	for _, key := range keys {
		requireStatus(t, r.byKey(key), models.NotificationCancelled)
	}

	result := r.reconcile()
	if result.Scanned != 0 {
		t.Fatalf("an inactive recipient must not be a candidate, scanned %d", result.Scanned)
	}

	w.exec(`UPDATE users SET is_active = true WHERE id = $1`, w.UserID)
	r.reconcile()
	for _, key := range keys {
		requireStatus(t, r.byKey(key), models.NotificationCancelled)
	}
	if got := w.countAll(); got != len(keys) {
		t.Fatalf("reactivation resurrected or duplicated notifications: %d rows", got)
	}
}

func TestStaleVersionIsCancelledBeforeSending(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	email := newSender()
	r, n := seedOneDue(t, w, newSender(), email)

	w.exec(`UPDATE registrations SET notification_content_version = notification_content_version + 1
		WHERE id = $1`, w.RegistrationID)

	r.work()

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationCancelled)
	requireAttempts(t, after, 0)
	if email.count() != 0 {
		t.Fatalf("a stale notification was sent: %d calls", email.count())
	}
}
