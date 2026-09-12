package finance

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	pgfinance "github.com/GoatWhistle/timeline/internal/adapters/postgres/finance"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type FinanceService struct {
	cases  *pgfinance.Cases
	tracks *event.Tracks
	events *event.Events
}

func NewFinanceService(cases *pgfinance.Cases, tracks *event.Tracks,
	events *event.Events) *FinanceService {
	return &FinanceService{cases: cases, tracks: tracks, events: events}
}

func (s *FinanceService) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.events.ResolveDisplayID(ctx, displayID)
}

func (s *FinanceService) Summary(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*dto.EventFinanceResponse, error) {
	target, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if !actor.IsAdmin && !target.Published() {
		return nil, models.NewNotFound("event not found")
	}
	tracks, err := s.tracks.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	cases, err := s.cases.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	return Summary(target, tracks, cases), nil
}
