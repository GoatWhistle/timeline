package event

import (
	"context"
	"errors"
	"log/slog"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

const colorClaimAttempts = 3

func (s *EventService) AssignColor(ctx context.Context, id uuid.UUID,
	origin models.EventOrigin) (*models.EventColorClaim, error) {
	var lastErr error
	for attempt := 0; attempt < colorClaimAttempts; attempt++ {
		claim, err := s.events.ClaimFreeColor(ctx, id, origin)
		if err != nil {
			if !errors.Is(err, models.ErrConflict) {
				return nil, err
			}
			lastErr = err
			continue
		}
		if claim != nil {
			return claim, nil
		}
		claim, err = s.events.RecycleOldestColor(ctx, id, origin)
		if err != nil {
			if !errors.Is(err, models.ErrConflict) {
				return nil, err
			}
			lastErr = err
			continue
		}
		return claim, nil
	}
	return nil, lastErr
}

func (s *EventService) releaseColor(ctx context.Context, id uuid.UUID) {
	if err := s.events.ReleaseColor(ctx, id); err != nil {
		slog.ErrorContext(ctx, "event colour was not released", "error", err)
	}
}

func (s *EventService) repaintOnOriginChange(ctx context.Context, id uuid.UUID,
	before models.EventOrigin, updated *models.Event) error {
	if updated.Origin == before {
		return nil
	}
	s.releaseColor(ctx, id)
	updated.ColorSlot, updated.ColorAssignedAt = nil, nil
	claim, err := s.AssignColor(ctx, id, updated.Origin)
	if err != nil {
		return err
	}
	if claim != nil {
		updated.ColorSlot, updated.ColorAssignedAt = &claim.Slot, &claim.AssignedAt
	}
	return nil
}
