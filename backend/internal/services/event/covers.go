package event

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type Covers interface {
	DeleteForEvent(ctx context.Context, keys models.EventCoverKeys)
	RefreshForWebsite(ctx context.Context, eventID uuid.UUID, website string)
}

func (s *EventService) WithCovers(c Covers) { s.covers = c }

func (s *EventService) Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	if !actor.IsAdmin {
		return models.NewForbidden("deleting an event is restricted to administrators")
	}
	var keys models.EventCoverKeys
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		keys = before.CoverKeys()
		if _, err := s.events.Delete(ctx, id); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditEventDelete, models.EntityEvent, id,
			map[string]any{"title": before.Title}, map[string]any{"deleted": true})
	})
	if err != nil {
		return err
	}
	if s.covers != nil {
		s.covers.DeleteForEvent(ctx, keys)
	}
	return nil
}

func (s *EventService) refreshCover(ctx context.Context, id uuid.UUID, website *string) {
	if s.covers == nil || website == nil || *website == "" {
		return
	}
	s.covers.RefreshForWebsite(ctx, id, *website)
}
