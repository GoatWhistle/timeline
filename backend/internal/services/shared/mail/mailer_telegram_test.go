package mail

import (
	"context"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type recordingTelegramSender struct{ sent []models.OutboundMessage }

func (s *recordingTelegramSender) Send(_ context.Context, msg models.OutboundMessage) error {
	s.sent = append(s.sent, msg)
	return nil
}

func (s *recordingTelegramSender) DeepLink(token string) string {
	return "https://t.me/bot?start=" + token
}

func TestSecurityLinksReachTelegramWhenTheAccountHasItLinkedAndUnmuted(t *testing.T) {
	email := &recordingMailSender{}
	telegram := &recordingTelegramSender{}
	mailer := NewMailer(email, telegram, "https://timeline.test")

	mailer.SendPasswordReset(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour,
		TelegramRecipient{ChatID: "42", Enabled: true})

	if len(telegram.sent) != 1 {
		t.Fatalf("expected the reset link to also reach telegram, got %d messages", len(telegram.sent))
	}
	if telegram.sent[0].Recipient != "42" {
		t.Errorf("telegram message went to chat %q, want 42", telegram.sent[0].Recipient)
	}
	if len(email.sent) != 1 {
		t.Fatalf("the email copy must still be sent, got %d messages", len(email.sent))
	}
}

func TestSecurityLinksStayEmailOnlyWithoutALinkedChat(t *testing.T) {
	email := &recordingMailSender{}
	telegram := &recordingTelegramSender{}
	mailer := NewMailer(email, telegram, "https://timeline.test")

	mailer.SendPasswordReset(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour,
		TelegramRecipient{})

	if len(telegram.sent) != 0 {
		t.Fatalf("no chat is linked, telegram must not receive anything, got %+v", telegram.sent)
	}
}

func TestSecurityLinksRespectAMutedTelegramChannel(t *testing.T) {
	email := &recordingMailSender{}
	telegram := &recordingTelegramSender{}
	mailer := NewMailer(email, telegram, "https://timeline.test")

	mailer.SendVerification(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour,
		TelegramRecipient{ChatID: "42", Enabled: false})

	if len(telegram.sent) != 0 {
		t.Fatalf("the telegram channel is muted, it must not receive a security link, got %+v", telegram.sent)
	}
}

func TestSecurityLinksTolerateANilTelegramSender(t *testing.T) {
	email := &recordingMailSender{}
	mailer := NewMailer(email, nil, "https://timeline.test")

	mailer.SendPasswordReset(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour,
		TelegramRecipient{ChatID: "42", Enabled: true})

	if len(email.sent) != 1 {
		t.Fatalf("the email copy must still go out even without a telegram sender wired up, got %d",
			len(email.sent))
	}
}
