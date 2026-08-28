package services

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

type recordingSender struct{ sent []models.OutboundMessage }

func (s *recordingSender) Send(_ context.Context, msg models.OutboundMessage) error {
	s.sent = append(s.sent, msg)
	return nil
}

func (s *recordingSender) last(t *testing.T) models.OutboundMessage {
	t.Helper()
	if len(s.sent) == 0 {
		t.Fatal("no message was sent")
	}
	return s.sent[len(s.sent)-1]
}

func testConfig(t *testing.T) *config.Config {
	t.Helper()
	tz, err := time.LoadLocation("UTC")
	if err != nil {
		t.Fatalf("loading timezone: %v", err)
	}
	cfg := &config.Config{}
	cfg.App.SystemTZ = tz
	cfg.App.SystemTZID = "UTC"
	return cfg
}

func candidate(recipientLocale string) models.ReconcileCandidate {
	return models.ReconcileCandidate{
		EventTitle:      "Demo Day",
		RegistrationURL: "https://example.test/register",
		DeadlineAt:      time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC),
		RecipientID:     uuid.New(),
		RecipientLocale: recipientLocale,
	}
}

func TestMailerRendersInRecipientLanguage(t *testing.T) {
	sender := &recordingSender{}
	mailer := NewMailer(sender, "https://timeline.test")

	mailer.SendVerification(context.Background(), "user@example.test", "John Smith", "en",
		"token123", 24*time.Hour)
	english := sender.last(t)
	if english.Subject != locale.Message("en", "email.verification.subject") {
		t.Errorf("subject is not English: %q", english.Subject)
	}
	if !strings.Contains(english.Body, "1 day") {
		t.Errorf("duration is not English: %q", english.Body)
	}

	mailer.SendVerification(context.Background(), "user@example.test", "John Smith", "ru",
		"token123", 24*time.Hour)
	russian := sender.last(t)
	if russian.Subject == english.Subject {
		t.Error("Russian recipient received the English subject")
	}
}

func TestMailerFallsBackToDefaultForUnknownLanguage(t *testing.T) {
	sender := &recordingSender{}
	mailer := NewMailer(sender, "https://timeline.test")

	mailer.SendInvite(context.Background(), "new@example.test", "Admin", "", "token123", time.Hour)
	got := sender.last(t)
	if got.Subject != locale.Message(locale.Default, "email.invite.subject") {
		t.Errorf("fallback is not the default language: %q", got.Subject)
	}
}

func TestPayloadRendersInRecipientLanguage(t *testing.T) {
	svc := &NotificationService{cfg: testConfig(t), now: func() time.Time { return time.Now().UTC() }}

	english := svc.payload(models.NotificationRequired, candidate("en"))
	if english.Language != "en" {
		t.Errorf("payload language = %q, want en", english.Language)
	}
	if english.Subject != locale.Message("en", "notification.primary.subject", "title", "Demo Day") {
		t.Errorf("subject is not English: %q", english.Subject)
	}

	russian := svc.payload(models.NotificationRequired, candidate("ru"))
	if russian.Language != "ru" {
		t.Errorf("payload language = %q, want ru", russian.Language)
	}
	if russian.Subject == english.Subject {
		t.Error("Russian recipient received the English subject")
	}
}

func TestPayloadFallsBackToDefaultForUnknownLanguage(t *testing.T) {
	svc := &NotificationService{cfg: testConfig(t), now: func() time.Time { return time.Now().UTC() }}

	got := svc.payload(models.NotificationReminder, candidate("de"))
	if got.Language != locale.Default {
		t.Errorf("payload language = %q, want %q", got.Language, locale.Default)
	}
}

func TestPayloadSnapshotIgnoresLaterLocaleChange(t *testing.T) {
	svc := &NotificationService{cfg: testConfig(t), now: func() time.Time { return time.Now().UTC() }}

	c := candidate("en")
	snapshot := *svc.payload(models.NotificationRequired, c)

	c.RecipientLocale = "ru"
	rerendered := svc.payload(models.NotificationRequired, c)

	if snapshot.Language != "en" {
		t.Fatalf("snapshot language changed to %q", snapshot.Language)
	}
	if snapshot.Subject == rerendered.Subject {
		t.Fatal("the two languages produced the same subject; the test proves nothing")
	}
}
