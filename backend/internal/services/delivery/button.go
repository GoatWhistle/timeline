package delivery

import (
	"context"
	"log/slog"
	"strings"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
)

const (
	keyRegisteredButton = "notification.telegram.button.registered"
	keyOpenButton       = "notification.telegram.open"
)

func (s *DeliveryService) applyTelegramContent(msg *models.OutboundMessage, n *models.Notification, userLocale string) {
	if n.Payload == nil || n.Payload.TelegramText == "" {
		return
	}
	msg.Subject = ""
	msg.Body = n.Payload.TelegramText
	msg.TelegramHTML = true
	if n.Payload.EventURL != "" {
		msg.OpenURL = n.Payload.EventURL
		msg.OpenText = locale.Message(locale.Normalize(userLocale), keyOpenButton)
	}
}

func emailHeadingKey(kind models.NotificationType) string {
	switch kind {
	case models.NotificationOverdue:
		return "notification.overdue.telegram.heading"
	case models.NotificationDeadlineReminder:
		return "notification.reminder.telegram.heading"
	case models.NotificationEventStartReminder:
		return "notification.event_start.telegram.heading"
	case models.NotificationStageStartReminder:
		return "notification.stage_start.telegram.heading"
	case models.NotificationEventEndReminder:
		return "notification.event_end.telegram.heading"
	case models.NotificationWeeklyDigest:
		return "notification.weekly_digest.telegram.heading"
	case models.NotificationPersonalTaskDue:
		return "notification.task_due.telegram.heading"
	case models.NotificationRetrospectiveDue:
		return "notification.retrospective_due.telegram.heading"
	default:
		return "notification.primary.telegram.heading"
	}
}

func emailHeading(lang string, n *models.Notification) string {
	key := emailHeadingKey(n.NotificationType)
	heading := locale.Message(lang, key, "days", "")
	if heading == key || strings.TrimSpace(heading) == "" {
		return n.Payload.Subject
	}
	return heading
}

func (s *DeliveryService) applyEmailContent(msg *models.OutboundMessage, n *models.Notification, user *models.User) {
	if n.Payload == nil {
		return
	}
	lang := locale.Normalize(user.Locale)
	link := n.Payload.RegistrationURL
	if link == "" {
		link = n.Payload.EventURL
	}
	subject, html, unsubscribeURL, err := mail.RenderNotificationEmail(mail.NotificationEmail{
		Lang:            lang,
		Theme:           string(user.Theme),
		PublicURL:       s.cfg.App.PublicURL,
		Subject:         n.Payload.Subject,
		Heading:         emailHeading(lang, n),
		Body:            n.Payload.Body,
		RegistrationURL: link,
	})
	if err != nil {
		slog.Warn("failed to render the notification email, falling back to plain text",
			"error", err, "notification_id", n.ID)
		return
	}
	msg.Subject = subject
	msg.HTML = html
	msg.UnsubscribeURL = unsubscribeURL
}

func (s *DeliveryService) attachRegistrationButton(ctx context.Context, msg *models.OutboundMessage,
	n *models.Notification, candidate *models.ReconcileCandidate, userLocale string) {
	if n.NotificationType != models.NotificationRequired || candidate == nil || s.events == nil {
		return
	}
	displayID, err := s.events.DisplayIDByID(ctx, candidate.EventID)
	if err != nil {
		slog.WarnContext(ctx, "could not attach the registration button",
			"error", err, "notification_id", n.ID)
		return
	}
	msg.ButtonData = telegramlink.RegistrationDoneCallbackData(displayID)
	msg.ButtonText = locale.Message(locale.Normalize(userLocale), keyRegisteredButton)
}
