//go:build integration

package delivery_test

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

func TestChannelNotSelectedIsNeverScheduled(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
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
		t.Fatalf("an unselected Telegram channel must not cost a provider call")
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

func TestPermanentErrorMakesOnlyItsOwnRowUndeliverable(t *testing.T) {
	w := newWorld(t)
	w.setChannels(true, true)
	permanent := models.NewPermanentDeliveryError("chat is blocked", nil)
	telegram := newSender(permanent)
	email := newSender()
	r := newRig(t, w, telegram, email)
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	result := r.reconcile()
	if result.Primary != 2 {
		t.Fatalf("expected one row per selected channel, got %+v", result)
	}

	r.work()
	r.work()

	telegramRow := r.byKey(r.primaryKey(models.ChannelTelegram))
	requireStatus(t, telegramRow, models.NotificationUndeliverable)
	emailRow := r.byKey(r.primaryKey(models.ChannelEmail))
	requireStatus(t, emailRow, models.NotificationSent)
	requireChannel(t, emailRow, models.ChannelEmail)

	if telegram.count() != 1 {
		t.Fatalf("expected exactly one telegram call, got %d", telegram.count())
	}
	if email.count() != 1 {
		t.Fatalf("the sibling channel's row must still be delivered, email calls %d", email.count())
	}
}

func TestPermanentErrorOnAllChannelsBecomesUndeliverable(t *testing.T) {
	w := newWorld(t)
	w.setChannels(true, true)
	permanent := models.NewPermanentDeliveryError("address is rejected", nil)
	telegram, email := newSender(permanent), newSender(permanent)
	r := newRig(t, w, telegram, email)
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	r.work()
	r.work()

	requireStatus(t, r.byKey(r.primaryKey(models.ChannelTelegram)), models.NotificationUndeliverable)
	requireStatus(t, r.byKey(r.primaryKey(models.ChannelEmail)), models.NotificationUndeliverable)
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

func TestUndeliverableRowStaysTerminalAfterChannelReappears(t *testing.T) {
	w := newWorld(t)
	w.setChannels(true, false)
	permanent := models.NewPermanentDeliveryError("chat is blocked", nil)
	telegram := newSender(permanent)
	r, n := seedOneDue(t, w, telegram, newSender())

	r.work()
	requireStatus(t, r.load(n.ID), models.NotificationUndeliverable)

	w.exec(`UPDATE users SET telegram_chat_id = 'chat-primary' WHERE id = $1`, w.UserID)
	r.clock.Advance(time.Hour)
	r.work()
	r.reconcile()

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationUndeliverable)
	if telegram.count() != 1 {
		t.Fatalf("a terminal row was resent after the channel reappeared, calls: %d", telegram.count())
	}
	if got := w.countByKey(n.LogicalKey); got != 1 {
		t.Fatalf("reconciliation duplicated a terminal logical key: %d rows", got)
	}
}

func TestRuleFollowsRecipientSelectionWithNoChannelChoiceOfItsOwn(t *testing.T) {
	w := newWorld(t)
	w.setChannels(true, true)
	w.clearSchedule()
	w.wantReminder(1)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	result := r.reconcile()
	if result.Primary != 2 {
		t.Fatalf("expected one primary row per selected profile channel, got %+v", result)
	}
	if result.Reminder != 2 {
		t.Fatalf("a reminder has no channel of its own: it must fan out across every selected "+
			"profile channel just like the primary occasion, got %+v", result)
	}

	requireStatus(t, r.byKey(r.reminderKey(1, models.ChannelTelegram)),
		models.NotificationPending)
	requireStatus(t, r.byKey(r.reminderKey(1, models.ChannelEmail)),
		models.NotificationPending)
}
