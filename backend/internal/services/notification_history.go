package services

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *NotificationService) History(ctx context.Context, actor models.Actor,
	page models.Page) ([]models.NotificationHistoryItem, int64, error) {
	if actor.IsSystem() {
		return nil, 0, models.NewUnauthorized("the notification history requires an authenticated user")
	}
	return s.repo.History(ctx, actor.UserID, page)
}
