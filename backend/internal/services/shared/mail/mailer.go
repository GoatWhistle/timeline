package mail

import (
	"context"
	"log/slog"
	"net/url"
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

type EmailSender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
}

type TelegramSender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
	DeepLink(token string) string
}

type Mailer struct {
	sender    EmailSender
	publicURL string
}

func NewMailer(sender EmailSender, publicURL string) *Mailer {
	return &Mailer{sender: sender, publicURL: strings.TrimRight(publicURL, "/")}
}

func (m *Mailer) SendVerification(ctx context.Context, to, displayName, lang, token string, ttl time.Duration) {
	m.sendTemplate(ctx, to, "email.verification", displayName, lang, m.query("/verify-email", token), ttl)
}

func (m *Mailer) SendPasswordReset(ctx context.Context, to, displayName, lang, token string, ttl time.Duration) {
	m.sendTemplate(ctx, to, "email.password_reset", displayName, lang, m.query("/reset-password", token), ttl)
}

func (m *Mailer) SendEmailChange(ctx context.Context, to, displayName, lang, token string, ttl time.Duration) {
	m.sendTemplate(ctx, to, "email.email_change", displayName, lang, m.query("/email-change/confirm", token), ttl)
}

func (m *Mailer) SendInvite(ctx context.Context, to, invitedBy, lang, token string, ttl time.Duration) {
	m.sendTemplate(ctx, to, "email.invite", invitedBy, lang, m.link("/invite", token), ttl)
}

func (m *Mailer) sendTemplate(ctx context.Context, to, key, name, lang, link string, ttl time.Duration) {
	lang = locale.Normalize(lang)
	args := []string{"name", name, "link", link, "ttl", humanDuration(lang, ttl)}
	m.send(ctx, to, locale.Message(lang, key+".subject", args...),
		locale.Message(lang, key+".body", args...))
}

func (m *Mailer) link(path, token string) string {
	return m.publicURL + path + "/" + token
}

func (m *Mailer) query(path, token string) string {
	return m.publicURL + path + "?token=" + url.QueryEscape(token)
}

func (m *Mailer) send(ctx context.Context, to, subject, body string) {
	err := m.sender.Send(ctx, models.OutboundMessage{Recipient: to, Subject: subject, Body: body})
	if err != nil {
		slog.ErrorContext(ctx, "failed to send authentication email",
			"error", err, "subject", subject)
	}
}

func humanDuration(lang string, d time.Duration) string {
	switch {
	case d >= 24*time.Hour:
		return locale.Plural(lang, "duration.day", int(d.Hours()/24))
	case d >= time.Hour:
		return locale.Plural(lang, "duration.hour", int(d.Hours()))
	default:
		return locale.Plural(lang, "duration.minute", int(d.Minutes()))
	}
}
