package services

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type StageService struct {
	db           *repositories.DB
	stages       *repositories.StageRepository
	events       *repositories.EventRepository
	participants *repositories.ParticipantRepository
	audit        *AuditService
}

func NewStageService(db *repositories.DB, stages *repositories.StageRepository,
	events *repositories.EventRepository, participants *repositories.ParticipantRepository,
	audit *AuditService) *StageService {
	return &StageService{db: db, stages: stages, events: events, participants: participants, audit: audit}
}

func (s *StageService) List(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.Stage, error) {
	if !actor.IsAdmin {
		event, err := s.events.GetByID(ctx, eventID)
		if err != nil {
			return nil, err
		}
		if !event.Published() {
			return nil, models.NewNotFound("event not found")
		}
		participant, err := s.participants.GetByEventUser(ctx, eventID, actor.UserID)
		if err != nil || !participant.Assigned() {
			return nil, models.NewNotFound("event not found")
		}
	}
	return s.stages.ListByEvent(ctx, eventID)
}

func (s *StageService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.CreateStageRequest) (*models.Stage, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	name, err := validateText("name", req.Name, 1, 120)
	if err != nil {
		return nil, err
	}
	if !req.Type.Valid() {
		return nil, models.NewValidation("invalid stage type",
			models.FieldError{Field: "type", Message: "value is not allowed"})
	}
	if !req.EndAt.After(req.StartAt) {
		return nil, models.NewValidation("stage end must be later than its start",
			models.FieldError{Field: "end_at", Message: "must be later than start_at"})
	}
	url, err := optionalHTTPS("url", req.URL)
	if err != nil {
		return nil, err
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	event, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if req.StartAt.Before(event.StartAt) || req.EndAt.After(event.EndAt) {
		slog.InfoContext(ctx, "stage extends beyond event period",
			"event_id", eventID, "stage_name", name)
	}

	var created *models.Stage
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		created, err = s.stages.Create(ctx, &models.Stage{
			EventID:     eventID,
			Name:        name,
			Type:        req.Type,
			StartAt:     req.StartAt.UTC(),
			EndAt:       req.EndAt.UTC(),
			Description: req.Description,
			URL:         url,
			SortOrder:   sortOrder,
		})
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStageCreate, models.EntityStage, created.ID, nil,
			map[string]any{"name": created.Name, "type": created.Type, "start_at": created.StartAt, "end_at": created.EndAt})
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (s *StageService) Update(ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateStageRequest) (*models.Stage, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if req.Name != nil {
		name, err := validateText("name", *req.Name, 1, 120)
		if err != nil {
			return nil, err
		}
		req.Name = &name
	}
	if req.Type != nil && !req.Type.Valid() {
		return nil, models.NewValidation("invalid stage type",
			models.FieldError{Field: "type", Message: "value is not allowed"})
	}
	if req.URL != nil && *req.URL != "" {
		url, err := validateHTTPS("url", *req.URL)
		if err != nil {
			return nil, err
		}
		req.URL = &url
	}

	var updated *models.Stage
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.stages.GetByID(ctx, id)
		if err != nil {
			return err
		}
		start := before.StartAt
		if req.StartAt != nil {
			start = req.StartAt.UTC()
		}
		end := before.EndAt
		if req.EndAt != nil {
			end = req.EndAt.UTC()
		}
		if !end.After(start) {
			return models.NewValidation("stage end must be later than its start",
				models.FieldError{Field: "end_at", Message: "must be later than start_at"})
		}

		updated, err = s.stages.Update(ctx, id, req)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStageUpdate, models.EntityStage, id,
			map[string]any{"name": before.Name, "start_at": before.StartAt, "end_at": before.EndAt},
			map[string]any{"name": updated.Name, "start_at": updated.StartAt, "end_at": updated.EndAt})
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *StageService) Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	if !actor.IsAdmin {
		return models.NewForbidden("the operation is restricted to administrators")
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.stages.GetByID(ctx, id)
		if err != nil {
			return err
		}
		if err := s.stages.Delete(ctx, id); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStageDelete, models.EntityStage, id,
			map[string]any{"name": before.Name, "event_id": before.EventID}, nil)
	})
}
