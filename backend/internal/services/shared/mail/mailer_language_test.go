package mail

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

type recordingMailSender struct{ sent []models.OutboundMessage }

func (s *recordingMailSender) Send(_ context.Context, msg models.OutboundMessage) error {
	s.sent = append(s.sent, msg)
	return nil
}

func (s *recordingMailSender) last(t *testing.T) models.OutboundMessage {
	t.Helper()
	if len(s.sent) == 0 {
		t.Fatal("no message was sent")
	}
	return s.sent[len(s.sent)-1]
}

func TestMailerRendersInRecipientLanguage(t *testing.T) {
	sender := &recordingMailSender{}
	mailer := NewMailer(sender, nil, "https://timeline.test")

	mailer.SendVerification(context.Background(), "user@example.test", "John Smith", "en", "dark",
		"token123", 24*time.Hour, TelegramRecipient{})
	english := sender.last(t)
	if english.Subject != locale.Message("en", "email.verification.subject") {
		t.Errorf("subject is not English: %q", english.Subject)
	}
	if !strings.Contains(english.Body, "1 day") {
		t.Errorf("duration is not English: %q", english.Body)
	}

	mailer.SendVerification(context.Background(), "user@example.test", "John Smith", "ru", "dark",
		"token123", 24*time.Hour, TelegramRecipient{})
	russian := sender.last(t)
	if russian.Subject == english.Subject {
		t.Error("Russian recipient received the English subject")
	}
}

func TestMailerFallsBackToDefaultForUnknownLanguage(t *testing.T) {
	sender := &recordingMailSender{}
	mailer := NewMailer(sender, nil, "https://timeline.test")

	mailer.SendEmailChange(context.Background(), "new@example.test", "Admin", "", "dark", "token123", time.Hour)
	got := sender.last(t)
	if got.Subject != locale.Message(locale.Default, "email.email_change.subject") {
		t.Errorf("fallback is not the default language: %q", got.Subject)
	}
}
