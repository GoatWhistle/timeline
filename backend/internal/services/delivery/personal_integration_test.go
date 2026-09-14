//go:build integration

package delivery_test

import (
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func personalNotice(w *world, kind models.NotificationType, key string) models.PersonalNotice {
	return models.PersonalNotice{
		Type:              kind,
		RecipientID:       w.UserID,
		RecipientLocale:   "en",
		RecipientTimezone: "UTC",
		RecipientChannels: models.RecipientChannels{
			TelegramLinked: true,
			EmailVerified:  true,
			Selected:       models.ChannelSet{models.ChannelTelegram, models.ChannelEmail},
		},
		EventTitle:      "Demo Day",
		EventDisplayID:  "",
		Subject:         "Task due: Record the demo",
		Body:            "Your task for Demo Day is due.",
		TelegramHeading: "Task due",
		LogicalKeyBase:  key,
	}
}

func TestPersonalNoticeHasNoRegistrationStatus(t *testing.T) {
	w := newWorld(t)
	r := newRig(t, w, newSender(), newSender())

	created, err := r.notifier.CreatePersonal(w.ctx,
		personalNotice(w, models.NotificationPersonalTaskDue, "test-personal-task-1"))
	if err != nil {
		t.Fatalf("creating a personal notice: %v", err)
	}
	if created != 2 {
		t.Fatalf("created %d notifications, want 2 (one per channel)", created)
	}

	n := r.byKey("test-personal-task-1:chTELEGRAM")
	if n.RegistrationStatusID != nil {
		t.Fatalf("a personal notification carries a registration status: %v", *n.RegistrationStatusID)
	}
	if n.EventID != nil {
		t.Fatalf("a personal notification carries an event id: %v", *n.EventID)
	}
}

func TestPersonalNoticeDeliversOverBothChannels(t *testing.T) {
	w := newWorld(t)
	telegram, email := newSender(), newSender()
	r := newRig(t, w, telegram, email)

	if _, err := r.notifier.CreatePersonal(w.ctx,
		personalNotice(w, models.NotificationRetrospectiveDue, "test-personal-retro-1")); err != nil {
		t.Fatalf("creating a personal notice: %v", err)
	}

	r.work()

	if len(telegram.calls) != 1 {
		t.Fatalf("telegram received %d messages, want 1", len(telegram.calls))
	}
	if len(email.calls) != 1 {
		t.Fatalf("email received %d messages, want 1", len(email.calls))
	}
	msg := email.calls[0]
	if msg.HTML == "" {
		t.Fatalf("the personal notification email has no HTML body")
	}
	if msg.Subject != "Task due: Record the demo" {
		t.Fatalf("email subject is %q, want the notice subject", msg.Subject)
	}
	if !strings.Contains(msg.HTML, "Your task for Demo Day is due.") {
		t.Fatalf("the rendered email does not contain the notice body")
	}
	tg := telegram.calls[0]
	if !strings.Contains(tg.Body, "Task due") {
		t.Fatalf("the telegram message %q does not contain the heading", tg.Body)
	}

	telegramNotification := r.byKey("test-personal-retro-1:chTELEGRAM")
	if telegramNotification.Status != models.NotificationSent {
		t.Fatalf("telegram delivery ended in status %s, want SENT", telegramNotification.Status)
	}
	emailNotification := r.byKey("test-personal-retro-1:chEMAIL")
	if emailNotification.Status != models.NotificationSent {
		t.Fatalf("email delivery ended in status %s, want SENT", emailNotification.Status)
	}
}

func TestPersonalNoticeLogicalKeyDeduplicates(t *testing.T) {
	w := newWorld(t)
	r := newRig(t, w, newSender(), newSender())

	notice := personalNotice(w, models.NotificationWeeklyDigest, "test-personal-digest-1")
	first, err := r.notifier.CreatePersonal(w.ctx, notice)
	if err != nil {
		t.Fatalf("creating a personal notice: %v", err)
	}
	if first != 2 {
		t.Fatalf("created %d notifications on first pass, want 2", first)
	}

	second, err := r.notifier.CreatePersonal(w.ctx, notice)
	if err != nil {
		t.Fatalf("creating the same personal notice again: %v", err)
	}
	if second != 0 {
		t.Fatalf("a repeated personal notice created %d more rows, want 0", second)
	}
	if got := w.countByKey("test-personal-digest-1:chTELEGRAM"); got != 1 {
		t.Fatalf("logical_key %q matched %d rows, want exactly 1", "test-personal-digest-1:chTELEGRAM", got)
	}
}

func TestPersonalNoticeSkippedChannelBecomesUndeliverable(t *testing.T) {
	w := newWorld(t)
	telegram := newSender()
	r := newRig(t, w, telegram, newSender())
	w.setChannels(false, true)

	notice := personalNotice(w, models.NotificationPersonalTaskDue, "test-personal-task-undeliverable")
	notice.RecipientChannels = models.RecipientChannels{
		TelegramLinked: false,
		EmailVerified:  true,
		Selected:       models.ChannelSet{models.ChannelTelegram, models.ChannelEmail},
	}
	if _, err := r.notifier.CreatePersonal(w.ctx, notice); err != nil {
		t.Fatalf("creating a personal notice: %v", err)
	}

	r.clock.at = r.clock.at.Add(time.Minute)
	r.work()

	n := r.byKey("test-personal-task-undeliverable:chTELEGRAM")
	if n.Status != models.NotificationUndeliverable {
		t.Fatalf("a notice with no telegram link ended in status %s, want UNDELIVERABLE", n.Status)
	}
	if n.AttemptCount != 0 {
		t.Fatalf("a channel unavailable before the first provider call still recorded %d attempts, want 0: "+
			"resolvePersonalCandidate must reflect the live telegram link, not the notice snapshot", n.AttemptCount)
	}
	if len(telegram.calls) != 0 {
		t.Fatalf("telegram received %d messages for an unlinked recipient, want 0", len(telegram.calls))
	}
}

func TestPersonalTelegramTextEscapesUserSuppliedTitles(t *testing.T) {
	w := newWorld(t)
	telegram, email := newSender(), newSender()
	r := newRig(t, w, telegram, email)

	notice := personalNotice(w, models.NotificationPersonalTaskDue, "test-personal-escape-1")
	notice.Body = `Your task for <script>alert(1)</script> & Co is due.`
	notice.TelegramHeading = `Task <b>due</b>`
	if _, err := r.notifier.CreatePersonal(w.ctx, notice); err != nil {
		t.Fatalf("creating a personal notice: %v", err)
	}

	r.work()

	if telegram.count() != 1 {
		t.Fatalf("expected exactly one telegram call, got %d", telegram.count())
	}
	body := telegram.last().Body
	if strings.Contains(body, "<script>") || strings.Contains(body, "<b>due</b>") {
		t.Fatalf("TestPersonalTelegramTextEscapesUserSuppliedTitles: a user-supplied title reached "+
			"Telegram as live markup, so a task name can rewrite the message: %q", body)
	}
	if !strings.Contains(body, "&lt;script&gt;") || !strings.Contains(body, "&amp; Co") {
		t.Fatalf("TestPersonalTelegramTextEscapesUserSuppliedTitles: expected escaped entities in "+
			"the personal telegram text, got %q", body)
	}
}
