//go:build integration

package notification_test

import (
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func seedOneDue(t *testing.T, w *world, telegram, email *recordingSender) (*rig, *models.Notification) {
	t.Helper()
	r := newRig(t, w, telegram, email)
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()
	return r, r.only()
}

func TestFallbackToEmailWhenTelegramUnavailable(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	w.setPreferredChannel(models.ChannelTelegram)
	telegram, email := newSender(), newSender()
	r, n := seedOneDue(t, w, telegram, email)

	if n.RequestedChannel != models.ChannelEmail {
		t.Fatalf("expected requested_channel EMAIL, got %s", n.RequestedChannel)
	}

	r.work()

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationSent)
	requireChannel(t, after, models.ChannelEmail)
	requireAttempts(t, after, 1)
	if telegram.count() != 0 {
		t.Fatalf("an unavailable Telegram channel must not cost a provider call")
	}
	if email.count() != 1 {
		t.Fatalf("expected exactly one email call, got %d", email.count())
	}
}

func TestNoChannelBecomesUndeliverable(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, false)
	telegram, email := newSender(), newSender()
	r, n := seedOneDue(t, w, telegram, email)

	r.work()

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationUndeliverable)
	requireAttempts(t, after, 0)
	if telegram.count()+email.count() != 0 {
		t.Fatalf("no provider call may be made without an available channel")
	}

	var status string
	if err := w.pool.QueryRow(w.ctx,
		`SELECT status FROM registration_statuses WHERE id = $1`, w.StatusID).Scan(&status); err != nil {
		t.Fatalf("reading status: %v", err)
	}
	if status != "TODO" {
		t.Fatalf("RegistrationStatus must stay TODO, got %s", status)
	}
}

func TestTemporaryErrorsRetryWithBackoffAndSucceed(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	temporary := models.NewTemporaryDeliveryError("provider is unavailable", nil)
	email := newSender(temporary, temporary, temporary, nil)
	r, n := seedOneDue(t, w, newSender(), email)

	steps := []time.Duration{time.Minute, 5 * time.Minute, 30 * time.Minute}
	for i, want := range steps {
		before := r.clock.at
		r.work()
		after := r.load(n.ID)
		requireStatus(t, after, models.NotificationPending)
		requireAttempts(t, after, i+1)
		if after.NextAttemptAt == nil {
			t.Fatalf("attempt %d left no next_attempt_at", i+1)
		}
		if got := after.NextAttemptAt.Sub(before); got != want {
			t.Fatalf("attempt %d: expected backoff %v, got %v", i+1, want, got)
		}
		if after.ProviderCallStartedAt != nil {
			t.Fatalf("attempt %d left provider_call_started_at set", i+1)
		}
		r.clock.Advance(want)
	}

	r.work()
	final := r.load(n.ID)
	requireStatus(t, final, models.NotificationSent)
	requireAttempts(t, final, 4)
	if final.NextAttemptAt != nil {
		t.Fatalf("a sent notification must not keep next_attempt_at")
	}
	if email.count() != 4 {
		t.Fatalf("expected four provider calls, got %d", email.count())
	}
}

func TestRetryExhaustionFails(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	temporary := models.NewTemporaryDeliveryError("provider is unavailable", nil)
	email := newSender(temporary, temporary, temporary, temporary)
	r, n := seedOneDue(t, w, newSender(), email)

	for _, step := range []time.Duration{time.Minute, 5 * time.Minute, 30 * time.Minute, 0} {
		r.work()
		r.clock.Advance(step)
	}

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationFailed)
	requireAttempts(t, after, 4)
	if after.NextAttemptAt != nil {
		t.Fatalf("a failed notification must have next_attempt_at NULL, got %v", after.NextAttemptAt)
	}
	if email.count() != 4 {
		t.Fatalf("expected exactly four provider calls, got %d", email.count())
	}

	r.clock.Advance(time.Hour)
	r.work()
	if email.count() != 4 {
		t.Fatalf("a FAILED notification must not be picked up again, calls: %d", email.count())
	}
}

func TestPermanentErrorSwitchesChannelWithoutBackoff(t *testing.T) {
	w := newWorld(t)
	w.setChannels(true, true)
	w.setPreferredChannel(models.ChannelTelegram)
	telegram := newSender(models.NewPermanentDeliveryError("chat is blocked", nil))
	email := newSender()
	r, n := seedOneDue(t, w, telegram, email)

	if n.RequestedChannel != models.ChannelTelegram {
		t.Fatalf("expected requested_channel TELEGRAM, got %s", n.RequestedChannel)
	}

	before := r.clock.at
	r.work()

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationSent)
	requireChannel(t, after, models.ChannelEmail)
	requireAttempts(t, after, 2)
	if telegram.count() != 1 || email.count() != 1 {
		t.Fatalf("expected one call per channel, got telegram=%d email=%d", telegram.count(), email.count())
	}
	if after.SentAt == nil || after.SentAt.Sub(before) != 0 {
		t.Fatalf("the channel switch must not apply backoff, sent_at delta %v", after.SentAt)
	}
	if !after.ChannelFailed(models.ChannelTelegram) {
		t.Fatalf("the permanently failed channel was not recorded: %v", after.FailedChannels)
	}
}

func TestPermanentErrorOnAllChannelsBecomesUndeliverable(t *testing.T) {
	w := newWorld(t)
	w.setChannels(true, true)
	w.setPreferredChannel(models.ChannelTelegram)
	permanent := models.NewPermanentDeliveryError("address is rejected", nil)
	telegram, email := newSender(permanent), newSender(permanent)
	r, n := seedOneDue(t, w, telegram, email)

	r.work()

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationUndeliverable)
	requireAttempts(t, after, 2)
	if telegram.count() != 1 || email.count() != 1 {
		t.Fatalf("expected one call per channel, got telegram=%d email=%d", telegram.count(), email.count())
	}

	var status string
	if err := w.pool.QueryRow(w.ctx,
		`SELECT status FROM registration_statuses WHERE id = $1`, w.StatusID).Scan(&status); err != nil {
		t.Fatalf("reading status: %v", err)
	}
	if status != "TODO" {
		t.Fatalf("RegistrationStatus must stay TODO, got %s", status)
	}
}

func TestUndeliverableStaysTerminalAfterNewChannelAppears(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, false)
	telegram, email := newSender(), newSender()
	r, n := seedOneDue(t, w, telegram, email)

	r.work()
	requireStatus(t, r.load(n.ID), models.NotificationUndeliverable)

	w.setChannels(true, true)
	r.clock.Advance(time.Hour)
	r.work()
	r.reconcile()

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationUndeliverable)
	if telegram.count()+email.count() != 0 {
		t.Fatalf("a terminal notification was resent after a channel appeared")
	}
	if got := w.countByKey(n.LogicalKey); got != 1 {
		t.Fatalf("reconciliation duplicated a terminal logical key: %d rows", got)
	}
}

func TestChannelOverrideWins(t *testing.T) {
	w := newWorld(t)
	w.setChannels(true, true)
	w.setPreferredChannel(models.ChannelTelegram)
	override := models.ChannelEmail
	w.addRule(60, 1, &override)
	telegram, email := newSender(), newSender()
	r := newRig(t, w, telegram, email)
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	r.work()

	if telegram.count() != 1 {
		t.Fatalf("the primary notification must follow the preferred channel, telegram calls %d", telegram.count())
	}
	if email.count() != 1 {
		t.Fatalf("the rule override must force EMAIL, email calls %d", email.count())
	}
}
