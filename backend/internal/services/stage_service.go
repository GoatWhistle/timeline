package services

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/repositories"
	"github.com/GoatWhistle/timeline/internal/models"
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

func (s *StageService) List(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) ([]models.Stage, *models.Event, error) {
	event, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, nil, err
	}
	if !actor.IsAdmin {
		if !event.Published() {
			return nil, nil, models.NewNotFound("event not found")
		}
		participant, err := s.participants.GetByEventUser(ctx, eventID, actor.UserID)
		if err != nil || !participant.Assigned() {
			return nil, nil, models.NewNotFound("event not found")
		}
	}
	items, err := s.stages.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, nil, err
	}
	return items, event, nil
}

func (s *StageService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.CreateStageRequest) (*models.Stage, *models.Event, error) {
	if !actor.IsAdmin {
		return nil, nil, models.NewForbidden("the operation is restricted to administrators")
	}
	name, err := validateText("name", req.Name, 1, 120)
	if err != nil {
		return nil, nil, err
	}
	if !req.Type.Valid() {
		return nil, nil, models.NewValidation("invalid stage type",
			models.FieldError{Field: "type", Message: "value is not allowed"})
	}
	if !req.EndAt.After(req.StartAt) {
		return nil, nil, models.NewValidation("stage end must be later than its start",
			models.FieldError{Field: "end_at", Message: "must be later than start_at"})
	}
	url, err := optionalHTTPS("url", req.URL)
	if err != nil {
		return nil, nil, err
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}
	place, err := resolveStagePlace(req.Format, false, req.CountryCode, req.City,
		req.Venue, req.OnlineURL, stagePlace{})
	if err != nil {
		return nil, nil, err
	}

	event, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, nil, err
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
			Format:      place.format,
			CountryCode: place.countryCode,
			City:        place.city,
			Venue:       place.venue,
			OnlineURL:   place.onlineURL,
			SortOrder:   sortOrder,
		})
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStageCreate, models.EntityStage, created.ID, nil,
			map[string]any{"name": created.Name, "type": created.Type, "start_at": created.StartAt, "end_at": created.EndAt})
	})
	if err != nil {
		return nil, nil, err
	}
	return created, event, nil
}

func (s *StageService) Update(ctx context.Context, actor models.Actor, id uuid.UUID,
	req models.UpdateStageRequest) (*models.Stage, *models.Event, error) {
	if !actor.IsAdmin {
		return nil, nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if req.Name != nil {
		name, err := validateText("name", *req.Name, 1, 120)
		if err != nil {
			return nil, nil, err
		}
		req.Name = &name
	}
	if req.Type != nil && !req.Type.Valid() {
		return nil, nil, models.NewValidation("invalid stage type",
			models.FieldError{Field: "type", Message: "value is not allowed"})
	}
	if req.URL != nil && *req.URL != "" {
		url, err := validateURL("url", *req.URL)
		if err != nil {
			return nil, nil, err
		}
		req.URL = &url
	}

	var (
		updated *models.Stage
		event   *models.Event
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.stages.GetByID(ctx, id)
		if err != nil {
			return err
		}
		event, err = s.events.GetByID(ctx, before.EventID)
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

		place, err := resolveStagePlace(req.Format, req.ClearFormat, req.CountryCode, req.City,
			req.Venue, req.OnlineURL, stagePlace{format: before.Format, countryCode: before.CountryCode,
				city: before.City, venue: before.Venue, onlineURL: before.OnlineURL})
		if err != nil {
			return err
		}

		updated, err = s.stages.Update(ctx, id, req, stagePlacePatch(place))
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStageUpdate, models.EntityStage, id,
			map[string]any{"name": before.Name, "start_at": before.StartAt, "end_at": before.EndAt},
			map[string]any{"name": updated.Name, "start_at": updated.StartAt, "end_at": updated.EndAt})
	})
	if err != nil {
		return nil, nil, err
	}
	return updated, event, nil
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
