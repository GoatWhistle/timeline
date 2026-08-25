package services

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// EmailSender — адаптер отправки писем.
type EmailSender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
}

// TelegramSender — адаптер отправки сообщений в Telegram.
type TelegramSender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
	DeepLink(token string) string
}

// Mailer формирует и отправляет письма аутентификации. Такие письма
// разрешены независимо от подтверждения адреса: запрет раздела 3 ТЗ
// касается только продуктовых напоминаний.
type Mailer struct {
	sender    EmailSender
	publicURL string
}

// NewMailer создаёт отправителя писем аутентификации.
func NewMailer(sender EmailSender, publicURL string) *Mailer {
	return &Mailer{sender: sender, publicURL: strings.TrimRight(publicURL, "/")}
}

// SendVerification отправляет письмо подтверждения адреса.
func (m *Mailer) SendVerification(ctx context.Context, to, displayName, token string, ttl time.Duration) {
	m.send(ctx, to, "Подтверждение адреса в Hackathon Tracker", fmt.Sprintf(
		"%s, здравствуйте!\n\n"+
			"Подтвердите адрес электронной почты, чтобы получать напоминания о регистрации на хакатоны:\n%s\n\n"+
			"Ссылка действует %s. Если вы не создавали учётную запись, просто игнорируйте это письмо.",
		displayName, m.link("/verify-email", token), humanDuration(ttl)))
}

// SendPasswordReset отправляет письмо восстановления доступа.
func (m *Mailer) SendPasswordReset(ctx context.Context, to, displayName, token string, ttl time.Duration) {
	m.send(ctx, to, "Восстановление доступа в Hackathon Tracker", fmt.Sprintf(
		"%s, здравствуйте!\n\n"+
			"Для установки нового пароля перейдите по ссылке:\n%s\n\n"+
			"Ссылка действует %s. После смены пароля все активные сессии будут завершены.\n"+
			"Если вы не запрашивали восстановление, просто игнорируйте это письмо.",
		displayName, m.link("/reset-password", token), humanDuration(ttl)))
}

// SendEmailChange отправляет письмо подтверждения нового адреса.
func (m *Mailer) SendEmailChange(ctx context.Context, to, displayName, token string, ttl time.Duration) {
	m.send(ctx, to, "Подтверждение нового адреса в Hackathon Tracker", fmt.Sprintf(
		"%s, здравствуйте!\n\n"+
			"Подтвердите новый адрес электронной почты:\n%s\n\n"+
			"Ссылка действует %s. До подтверждения вход выполняется по прежнему адресу.",
		displayName, m.link("/confirm-email", token), humanDuration(ttl)))
}

// SendInvite отправляет приглашение на регистрацию.
func (m *Mailer) SendInvite(ctx context.Context, to, invitedBy, token string, ttl time.Duration) {
	m.send(ctx, to, "Приглашение в Hackathon Tracker", fmt.Sprintf(
		"Здравствуйте!\n\n"+
			"%s приглашает вас в Hackathon Tracker — систему учёта хакатонов и регистраций.\n"+
			"Чтобы создать учётную запись, перейдите по ссылке:\n%s\n\n"+
			"Приглашение действует %s.",
		invitedBy, m.link("/invite", token), humanDuration(ttl)))
}

func (m *Mailer) link(path, token string) string {
	return m.publicURL + path + "/" + token
}

// send отправляет письмо и не прерывает основную операцию при отказе провайдера:
// доменная транзакция уже зафиксирована, а повтор доступен через resend.
func (m *Mailer) send(ctx context.Context, to, subject, body string) {
	err := m.sender.Send(ctx, models.OutboundMessage{Recipient: to, Subject: subject, Body: body})
	if err != nil {
		slog.ErrorContext(ctx, "не удалось отправить письмо аутентификации",
			"error", err, "subject", subject)
	}
}

// humanDuration переводит срок действия в короткую формулировку на русском.
func humanDuration(d time.Duration) string {
	switch {
	case d >= 24*time.Hour:
		return plural(int(d.Hours()/24), "%d день", "%d дня", "%d дней")
	case d >= time.Hour:
		return plural(int(d.Hours()), "%d час", "%d часа", "%d часов")
	default:
		return plural(int(d.Minutes()), "%d минуту", "%d минуты", "%d минут")
	}
}

// plural подбирает форму существительного для числительного в русском языке.
func plural(n int, one, few, many string) string {
	mod100 := n % 100
	mod10 := n % 10
	switch {
	case mod100 >= 11 && mod100 <= 14:
		return fmt.Sprintf(many, n)
	case mod10 == 1:
		return fmt.Sprintf(one, n)
	case mod10 >= 2 && mod10 <= 4:
		return fmt.Sprintf(few, n)
	default:
		return fmt.Sprintf(many, n)
	}
}
