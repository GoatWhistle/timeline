package delivery

import (
	"context"
	"errors"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *DeliveryService) resolvePersonalCandidate(ctx context.Context,
	n *models.Notification) (*models.ReconcileCandidate, bool, error) {
	if n.Payload == nil {
		return nil, true, s.notifications.MarkFailed(ctx, n.ID, "the content snapshot is unavailable")
	}
	user, err := s.users.GetByID(ctx, n.RecipientUserID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, true, s.notifications.MarkCancelled(ctx, n.ID, "the recipient is unavailable")
		}
		return nil, true, err
	}
	candidate := &models.ReconcileCandidate{
		RecipientID: user.ID,
		RecipientChannels: models.RecipientChannels{
			TelegramLinked: user.TelegramLinked(),
			EmailVerified:  user.EmailVerified(),
			Selected:       user.NotificationChannels,
		},
	}
	return candidate, false, nil
}
