package controllers

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type EventService interface {
	Create(ctx context.Context, actor models.Actor, req models.CreateEventRequest) (*models.Event, error)
	Update(ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateEventRequest) (*models.Event, error)
	Get(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
	List(
		ctx context.Context, actor models.Actor, filter models.EventFilter, page models.Page,
	) ([]models.Event, int64, error)
	Publish(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
	Archive(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
}

type StageService interface {
	List(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.Stage, *models.Event, error)
	Create(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.CreateStageRequest,
	) (*models.Stage, *models.Event, error)
	Update(
		ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateStageRequest,
	) (*models.Stage, *models.Event, error)
	Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error
}
