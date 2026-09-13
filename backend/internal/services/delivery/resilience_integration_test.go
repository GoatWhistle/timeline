//go:build integration

package delivery_test

import (
	"errors"
	"io"
	"net"
	"syscall"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func seedEmailDue(t *testing.T, w *world, email *recordingSender) (*rig, *models.Notification) {
	t.Helper()
	w.setChannels(false, true)
	r := newRig(t, w, newSender(), email)
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()
	return r, r.only()
}

func TestSmtpOutageRetriesThenGivesUpWithinTheConfiguredBudget(t *testing.T) {
	w := newWorld(t)
	outage := models.NewTemporaryDeliveryError("failed to connect to the SMTP server",
		&net.OpError{Op: "dial", Err: syscall.ECONNREFUSED})
	email := newSender(outage, outage, outage, outage, outage, outage)
	r, n := seedEmailDue(t, w, email)

	started := r.clock.at
	steps := w.cfg.Notify.Backoff
	var budget time.Duration
	for attempt := 1; attempt <= w.cfg.Notify.MaxProviderCalls; attempt++ {
		r.work()
		after := r.load(n.ID)
		if attempt < w.cfg.Notify.MaxProviderCalls {
			requireStatus(t, after, models.NotificationPending)
			if after.NextAttemptAt == nil {
				t.Fatalf("attempt %d left no next_attempt_at", attempt)
			}
			want := steps[min(attempt-1, len(steps)-1)]
			if got := after.NextAttemptAt.Sub(r.clock.at); got != want {
				t.Fatalf("attempt %d: expected backoff %v, got %v", attempt, want, got)
			}
			r.clock.Advance(want)
			budget += want
			continue
		}
		requireStatus(t, after, models.NotificationFailed)
	}

	final := r.load(n.ID)
	requireStatus(t, final, models.NotificationFailed)
	requireAttempts(t, final, w.cfg.Notify.MaxProviderCalls)
	if final.NextAttemptAt != nil {
		t.Fatalf("a notification that gave up must not keep next_attempt_at")
	}
	if final.LeaseExpiresAt != nil {
		t.Fatalf("a notification that gave up must not keep a lease")
	}
	if email.count() != w.cfg.Notify.MaxProviderCalls {
		t.Fatalf("expected %d provider calls, got %d", w.cfg.Notify.MaxProviderCalls, email.count())
	}
	t.Logf("SMTP outage: gave up after %d calls spanning %v of backoff (%v to %v)",
		w.cfg.Notify.MaxProviderCalls, budget, started, r.clock.at)

	r.clock.Advance(24 * time.Hour)
	r.work()
	if email.count() != w.cfg.Notify.MaxProviderCalls {
		t.Fatalf("a FAILED notification was retried again, calls: %d", email.count())
	}
}

func TestSmtpOutageDoesNotLoseTheNotificationWhenTheProviderRecovers(t *testing.T) {
	w := newWorld(t)
	outage := models.NewTemporaryDeliveryError("failed to connect to the SMTP server",
		&net.OpError{Op: "dial", Err: syscall.ECONNREFUSED})
	email := newSender(outage, outage, nil)
	r, n := seedEmailDue(t, w, email)

	for _, step := range w.cfg.Notify.Backoff[:2] {
		r.work()
		requireStatus(t, r.load(n.ID), models.NotificationPending)
		r.clock.Advance(step)
	}
	r.work()

	final := r.load(n.ID)
	requireStatus(t, final, models.NotificationSent)
	requireChannel(t, final, models.ChannelEmail)
	requireAttempts(t, final, 3)
	if email.count() != 3 {
		t.Fatalf("expected three provider calls, got %d", email.count())
	}
}

func TestFlakyTelegramProxyDropsConnectionAndDeliveryStillSucceeds(t *testing.T) {
	w := newWorld(t)
	w.setChannels(true, false)
	dropped := models.NewTemporaryDeliveryError("Telegram is unavailable",
		&net.OpError{Op: "read", Err: syscall.ECONNRESET})
	eof := models.NewTemporaryDeliveryError("Telegram is unavailable", io.ErrUnexpectedEOF)
	telegram := newSender(dropped, eof, nil)
	r := newRig(t, w, telegram, newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()
	n := r.only()

	for _, step := range w.cfg.Notify.Backoff[:2] {
		r.work()
		after := r.load(n.ID)
		requireStatus(t, after, models.NotificationPending)
		if after.ChannelFailed(models.ChannelTelegram) {
			t.Fatalf("a dropped connection must not close the Telegram channel")
		}
		r.clock.Advance(step)
	}
	r.work()

	final := r.load(n.ID)
	requireStatus(t, final, models.NotificationSent)
	requireChannel(t, final, models.ChannelTelegram)
	if len(final.FailedChannels) != 0 {
		t.Fatalf("a survived outage must leave no failed channels, got %v", final.FailedChannels)
	}
	if telegram.count() != 3 {
		t.Fatalf("expected three Telegram calls, got %d", telegram.count())
	}
}

func TestUnknownAddressBecomesUndeliverableInsteadOfStayingPending(t *testing.T) {
	w := newWorld(t)
	rejected := models.NewPermanentDeliveryError("the address does not exist",
		errors.New("550 5.1.1 unknown recipient"))
	email := newSender(rejected)
	r, n := seedEmailDue(t, w, email)

	r.work()

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationUndeliverable)
	if after.NextAttemptAt != nil {
		t.Fatalf("an undeliverable notification must not stay scheduled for a retry")
	}
	if after.LeaseExpiresAt != nil {
		t.Fatalf("an undeliverable notification must not keep a lease")
	}
	if !after.ChannelFailed(models.ChannelEmail) {
		t.Fatalf("the rejected channel must be recorded as failed, got %v", after.FailedChannels)
	}

	r.clock.Advance(48 * time.Hour)
	r.work()
	if email.count() != 1 {
		t.Fatalf("an undeliverable notification was retried, calls: %d", email.count())
	}
	requireStatus(t, r.load(n.ID), models.NotificationUndeliverable)
}
