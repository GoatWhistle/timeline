package event

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared"
)

type StageService struct {
	db           *postgres.DB
	stages       *event.Stages
	events       *event.Events
	participants *participation.Participants
	audit        *shared.AuditService
}

func NewStageService(db *postgres.DB, stages *event.Stages,
	events *event.Events, participants *participation.Participants,
	audit *shared.AuditService) *StageService {
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

type stageDraft struct {
	name      string
	url       *string
	sortOrder int
	place     stagePlace
}

func validateStageDraft(req models.CreateStageRequest) (stageDraft, error) {
	var out stageDraft
	name, err := shared.ValidateText("name", req.Name, 1, 120)
	if err != nil {
		return out, err
	}
	if !req.Type.Valid() {
		return out, models.NewValidation("invalid stage type",
			models.FieldError{Field: "type", Message: "value is not allowed"})
	}
	if !req.EndAt.After(req.StartAt) {
		return out, models.NewValidation("stage end must be later than its start",
			models.FieldError{Field: "end_at", Message: "must be later than start_at"})
	}
	url, err := shared.OptionalURL("url", req.URL)
	if err != nil {
		return out, err
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}
	place, err := resolveStagePlace(req.Format, false, req.CountryCode, req.City,
		req.Venue, req.OnlineURL, stagePlace{})
	if err != nil {
		return out, err
	}
	return stageDraft{name: name, url: url, sortOrder: sortOrder, place: place}, nil
}

func (s *StageService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.CreateStageRequest) (*models.Stage, *models.Event, error) {
	if !actor.IsAdmin {
		return nil, nil, models.NewForbidden("the operation is restricted to administrators")
	}
	draft, err := validateStageDraft(req)
	if err != nil {
		return nil, nil, err
	}
	name, url, sortOrder, place := draft.name, draft.url, draft.sortOrder, draft.place

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
			map[string]any{
				"name":     created.Name,
				"type":     created.Type,
				"start_at": created.StartAt,
				"end_at":   created.EndAt,
			})
	})
	if err != nil {
		return nil, nil, err
	}
	return created, event, nil
}

func validateStagePatch(req models.UpdateStageRequest) (models.UpdateStageRequest, error) {
	if req.Name != nil {
		name, err := shared.ValidateText("name", *req.Name, 1, 120)
		if err != nil {
			return req, err
		}
		req.Name = &name
	}
	if req.Type != nil && !req.Type.Valid() {
		return req, models.NewValidation("invalid stage type",
			models.FieldError{Field: "type", Message: "value is not allowed"})
	}
	if req.URL != nil && *req.URL != "" {
		url, err := shared.ValidateURL("url", *req.URL)
		if err != nil {
			return req, err
		}
		req.URL = &url
	}
	return req, nil
}

func checkStageWindow(before *models.Stage, req models.UpdateStageRequest) error {
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
	return nil
}

func (s *StageService) Update(ctx context.Context, actor models.Actor, id uuid.UUID,
	req models.UpdateStageRequest) (*models.Stage, *models.Event, error) {
	if !actor.IsAdmin {
		return nil, nil, models.NewForbidden("the operation is restricted to administrators")
	}
	req, err := validateStagePatch(req)
	if err != nil {
		return nil, nil, err
	}

	var (
		updated *models.Stage
		event   *models.Event
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.stages.GetByID(ctx, id)
		if err != nil {
			return err
		}
		event, err = s.events.GetByID(ctx, before.EventID)
		if err != nil {
			return err
		}
		if err := checkStageWindow(before, req); err != nil {
			return err
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
