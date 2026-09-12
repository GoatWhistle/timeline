package delivery

import (
	"context"
	"log/slog"

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
		Heading:         n.Payload.Subject,
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
