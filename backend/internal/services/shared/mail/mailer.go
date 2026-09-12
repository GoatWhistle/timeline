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

const inviteKey = "email.invite"

type EmailSender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
}

type TelegramSender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
	DeepLink(token string) string
}

type Mailer struct {
	sender    EmailSender
	telegram  TelegramSender
	publicURL string
}

func NewMailer(sender EmailSender, telegram TelegramSender, publicURL string) *Mailer {
	return &Mailer{sender: sender, telegram: telegram, publicURL: strings.TrimRight(publicURL, "/")}
}

func (m *Mailer) SendVerification(ctx context.Context, to, displayName, lang, token string, ttl time.Duration,
	tg TelegramRecipient) {
	m.sendTemplate(ctx, to, "email.verification", displayName, lang, m.query("/verify-email", token), ttl, tg)
}

func (m *Mailer) SendPasswordReset(ctx context.Context, to, displayName, lang, token string, ttl time.Duration,
	tg TelegramRecipient) {
	m.sendTemplate(ctx, to, "email.password_reset", displayName, lang, m.query("/reset-password", token), ttl, tg)
}

func (m *Mailer) SendEmailChange(ctx context.Context, to, displayName, lang, token string, ttl time.Duration) {
	m.sendTemplate(ctx, to, "email.email_change", displayName, lang, m.query("/email-change/confirm", token), ttl,
		TelegramRecipient{})
}

func (m *Mailer) SendEmailChangeCancel(ctx context.Context, to, displayName, lang, token string, ttl time.Duration) {
	m.sendTemplate(ctx, to, "email.email_change_cancel", displayName, lang,
		m.query("/email-change/cancel", token), ttl, TelegramRecipient{})
}

func (m *Mailer) SendInvite(ctx context.Context, to, invitedBy, lang, token string, ttl time.Duration) {
	m.sendTemplate(ctx, to, inviteKey, PersonalName(invitedBy), lang, m.link("/invite", token), ttl,
		TelegramRecipient{})
}

func (m *Mailer) SendPasswordChanged(ctx context.Context, to, displayName, lang string, tg TelegramRecipient) {
	m.sendTemplate(ctx, to, "email.password_changed", displayName, lang, m.publicURL+"/login", 0, tg)
}

// TelegramRecipient carries the linked chat, if any, that a security link may also be sent to.
// A security link doubles its attack surface with every channel it reaches, so it is only ever
// handed the same short-lived token already minted for email - never a separate, longer-lived one.
type TelegramRecipient struct {
	ChatID  string
	Enabled bool
}

func (r TelegramRecipient) linked() bool {
	return r.Enabled && r.ChatID != ""
}

func (m *Mailer) sendTemplate(ctx context.Context, to, key, name, lang string, link string, ttl time.Duration,
	tg TelegramRecipient) {
	lang = locale.Normalize(lang)
	m.send(ctx, to, compose(lang, key, name, link, humanDuration(lang, ttl)), tg)
}

func (m *Mailer) link(path, token string) string {
	return m.publicURL + path + "/" + token
}

func (m *Mailer) query(path, token string) string {
	return m.publicURL + path + "?token=" + url.QueryEscape(token)
}

func (m *Mailer) send(ctx context.Context, to string, l letter, tg TelegramRecipient) {
	body, err := l.html()
	if err != nil {
		slog.ErrorContext(ctx, "failed to render the email body", "error", err, "subject", l.Subject)
	}
	err = m.sender.Send(ctx, models.OutboundMessage{
		Recipient: to,
		Subject:   l.Subject,
		Body:      l.text(),
		HTML:      body,
	})
	if err != nil {
		slog.ErrorContext(ctx, "failed to send authentication email",
			"error", err, "subject", l.Subject)
	}
	m.sendTelegramCopy(ctx, l, tg)
}

func (m *Mailer) sendTelegramCopy(ctx context.Context, l letter, tg TelegramRecipient) {
	if m.telegram == nil || !tg.linked() {
		return
	}
	err := m.telegram.Send(ctx, models.OutboundMessage{
		Recipient: tg.ChatID,
		Subject:   l.Subject,
		Body:      l.text(),
	})
	if err != nil {
		slog.ErrorContext(ctx, "failed to send the telegram copy of an authentication link",
			"error", err, "subject", l.Subject)
	}
}

func PersonalName(name string) string {
	fields := strings.Fields(name)
	if len(fields) == 0 {
		return ""
	}
	first := fields[0]
	for _, field := range fields[1:] {
		if !strings.EqualFold(field, first) {
			return strings.Join(fields, " ")
		}
	}
	return first
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
