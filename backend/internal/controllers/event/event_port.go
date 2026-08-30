package event

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type EventService interface {
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	Create(ctx context.Context, actor models.Actor, req dto.CreateEventRequest) (*models.Event, error)
	Update(ctx context.Context, actor models.Actor, id uuid.UUID, req dto.UpdateEventRequest) (*models.Event, error)
	Get(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
	List(
		ctx context.Context, actor models.Actor, filter models.EventFilter, page models.Page,
	) ([]models.Event, int64, error)
	Publish(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
	Archive(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
}

type StageService interface {
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	List(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.Stage, *models.Event, error)
	Create(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req dto.CreateStageRequest,
	) (*models.Stage, *models.Event, error)
	Update(
		ctx context.Context, actor models.Actor, id uuid.UUID, req dto.UpdateStageRequest,
	) (*models.Stage, *models.Event, error)
	Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error
}
