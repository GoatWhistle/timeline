package realtime

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

const markReadBatchMax = 200

func (s *SystemEventService) List(ctx context.Context, actor models.Actor, unreadOnly bool,
	page models.Page) ([]models.SystemEventResponse, int64, error) {
	if actor.IsSystem() {
		return nil, 0, models.NewUnauthorized("authentication is required")
	}
	return s.events.List(ctx, actor.UserID, actor.IsAdmin, unreadOnly, page)
}

func (s *SystemEventService) UnreadCount(ctx context.Context, actor models.Actor) (int64, error) {
	if actor.IsSystem() {
		return 0, models.NewUnauthorized("authentication is required")
	}
	return s.events.UnreadCount(ctx, actor.UserID, actor.IsAdmin)
}

func (s *SystemEventService) MarkRead(ctx context.Context, actor models.Actor,
	ids []uuid.UUID) (int64, error) {
	if actor.IsSystem() {
		return 0, models.NewUnauthorized("authentication is required")
	}
	if len(ids) == 0 {
		return s.events.MarkAllRead(ctx, actor.UserID, actor.IsAdmin)
	}
	if len(ids) > markReadBatchMax {
		return 0, models.NewValidation("at most " + validation.Itoa(markReadBatchMax) + " identifiers per request")
	}
	return s.events.MarkRead(ctx, actor.UserID, actor.IsAdmin, ids)
}
