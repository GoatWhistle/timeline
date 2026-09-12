package finance

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *CaseService) readable(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*models.Event, error) {
	target, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if actor.IsAdmin {
		return target, nil
	}
	if !target.Published() {
		return nil, models.NewNotFound("event not found")
	}
	return target, nil
}

func (s *CaseService) writable(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	target, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if target.Archived() {
		return nil, models.NewStateTransition("an archived event cannot be changed")
	}
	return target, nil
}
