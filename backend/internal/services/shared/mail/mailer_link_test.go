package mail

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestMailerLinksMatchTheRoutesTheAppServes(t *testing.T) {
	cases := []struct {
		name string
		send func(m *Mailer)
		want string
	}{
		{
			name: "verification",
			send: func(m *Mailer) {
				m.SendVerification(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour, TelegramRecipient{})
			},
			want: "https://timeline.test/verify-email?token=tok",
		},
		{
			name: "password reset",
			send: func(m *Mailer) {
				m.SendPasswordReset(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour, TelegramRecipient{})
			},
			want: "https://timeline.test/reset-password?token=tok",
		},
		{
			name: "email change",
			send: func(m *Mailer) {
				m.SendEmailChange(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour)
			},
			want: "https://timeline.test/email-change/confirm?token=tok",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			sender := &recordingMailSender{}
			mailer := NewMailer(sender, nil, "https://timeline.test")
			tc.send(mailer)
			body := sender.last(t).Body
			if !strings.Contains(body, tc.want) {
				t.Errorf("the %s email does not carry %q:\n%s", tc.name, tc.want, body)
			}
		})
	}
}

func TestMailerTokenLinksCarryTheTokenAsAQueryParameter(t *testing.T) {
	sender := &recordingMailSender{}
	mailer := NewMailer(sender, nil, "https://timeline.test")

	mailer.SendVerification(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour, TelegramRecipient{})
	if strings.Contains(sender.last(t).Body, "/verify-email/tok") {
		t.Error("the verification link still uses a path segment the router has no route for")
	}

	mailer.SendPasswordReset(context.Background(), "user@example.test", "John", "en", "dark", "tok", time.Hour, TelegramRecipient{})
	if strings.Contains(sender.last(t).Body, "/reset-password/tok") {
		t.Error("the reset link still uses a path segment the router has no route for")
	}
}
