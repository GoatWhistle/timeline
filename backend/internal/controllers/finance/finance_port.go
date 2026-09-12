package finance

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type FinanceService interface {
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	Summary(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*dto.EventFinanceResponse, error)
}

type CaseService interface {
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	List(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*dto.EventCaseListResponse, error)
	Create(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.CreateEventCaseRequest,
	) (*dto.EventCaseResponse, error)
	Update(
		ctx context.Context, actor models.Actor, id uuid.UUID, req dto.UpdateEventCaseRequest,
	) (*dto.EventCaseResponse, error)
	Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error
}
