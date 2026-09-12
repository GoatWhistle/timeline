package delivery

import (
	"context"
	"log/slog"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
)

const keyRegisteredButton = "notification.telegram.button.registered"

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
