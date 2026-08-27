package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type Reconciler interface {
	ReconcileEvent(ctx context.Context, eventID uuid.UUID) error
}

type EventService struct {
	db            *repositories.DB
	events        *repositories.EventRepository
	registrations *repositories.RegistrationRepository
	notifier      *NotificationService
	reconciler    Reconciler
	audit         *AuditService
	now           func() time.Time
}

func NewEventService(db *repositories.DB, events *repositories.EventRepository,
	registrations *repositories.RegistrationRepository, notifier *NotificationService,
	reconciler Reconciler, audit *AuditService) *EventService {
	return &EventService{
		db: db, events: events, registrations: registrations, notifier: notifier,
		reconciler: reconciler, audit: audit, now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *EventService) Create(ctx context.Context, actor models.Actor, req models.CreateEventRequest) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("creating an event is restricted to administrators")
	}
	title, err := validateText("title", req.Title, 1, 200)
	if err != nil {
		return nil, err
	}
	if !req.EndAt.After(req.StartAt) {
		return nil, models.NewValidation("event end must be later than its start",
			models.FieldError{Field: "end_at", Message: "must be later than start_at"})
	}
	website, err := optionalHTTPS("website_url", req.WebsiteURL)
	if err != nil {
		return nil, err
	}

	var created *models.Event
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		created, err = s.events.Create(ctx, &models.Event{
			Title:       title,
			Description: req.Description,
			Organizer:   req.Organizer,
			WebsiteURL:  website,
			Notes:       req.Notes,
			StartAt:     req.StartAt.UTC(),
			EndAt:       req.EndAt.UTC(),
		})
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditEventCreate, models.EntityEvent, created.ID, nil,
			map[string]any{"title": created.Title, "start_at": created.StartAt, "end_at": created.EndAt})
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (s *EventService) Get(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	return s.events.GetByID(ctx, id)
}

func (s *EventService) List(ctx context.Context, actor models.Actor, filter models.EventFilter,
	page models.Page) ([]models.Event, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the operation is restricted to administrators")
	}
	return s.events.List(ctx, filter, page, s.now())
}

func (s *EventService) Update(ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateEventRequest) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("editing an event is restricted to administrators")
	}
	if req.Title != nil {
		title, err := validateText("title", *req.Title, 1, 200)
		if err != nil {
			return nil, err
		}
		req.Title = &title
	}
	if req.WebsiteURL != nil && *req.WebsiteURL != "" {
		website, err := validateHTTPS("website_url", *req.WebsiteURL)
		if err != nil {
			return nil, err
		}
		req.WebsiteURL = &website
	}

	var (
		updated       *models.Event
		scheduleReset bool
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if before.Archived() {
			return models.NewStateTransition("an archived event cannot be modified")
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
			return models.NewValidation("event end must be later than its start",
				models.FieldError{Field: "end_at", Message: "must be later than start_at"})
		}

		updated, err = s.events.Update(ctx, id, req)
		if err != nil {
			return err
		}

		if !updated.EndAt.Equal(before.EndAt) {
			registration, err := s.registrations.GetByEventForUpdate(ctx, id)
			switch {
			case err == nil:
				if _, err := s.registrations.BumpScheduleVersion(ctx, registration.ID); err != nil {
					return err
				}
				if err := s.notifier.CancelForRegistration(ctx, registration.ID); err != nil {
					return err
				}
				scheduleReset = true
			case errors.Is(err, models.ErrNotFound):
			default:
				return err
			}
		}

		return s.audit.Record(ctx, actor, models.AuditEventUpdate, models.EntityEvent, id,
			map[string]any{"title": before.Title, "start_at": before.StartAt, "end_at": before.EndAt},
			map[string]any{"title": updated.Title, "start_at": updated.StartAt, "end_at": updated.EndAt})
	})
	if err != nil {
		return nil, err
	}

	if scheduleReset {
		s.reconcile(ctx, id)
	}
	return updated, nil
}

func (s *EventService) Publish(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("publishing is restricted to administrators")
	}
	var published *models.Event
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if before.Archived() {
			return models.NewStateTransition("an archived event cannot be published")
		}
		if before.Published() {
			return models.NewStateTransition("event is already published")
		}
		published, err = s.events.Publish(ctx, id, s.now())
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditEventPublish, models.EntityEvent, id,
			map[string]any{"published_at": nil}, map[string]any{"published_at": published.PublishedAt})
	})
	if err != nil {
		return nil, err
	}

	s.reconcile(ctx, id)
	return published, nil
}

func (s *EventService) Archive(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("archiving is restricted to administrators")
	}
	var archived *models.Event
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if before.Archived() {
			return models.NewStateTransition("event is already archived")
		}
		archived, err = s.events.Archive(ctx, id, s.now())
		if err != nil {
			return err
		}
		if err := s.notifier.CancelForEvent(ctx, id); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditEventArchive, models.EntityEvent, id,
			map[string]any{"archived_at": nil}, map[string]any{"archived_at": archived.ArchivedAt})
	})
	if err != nil {
		return nil, err
	}
	return archived, nil
}

func (s *EventService) reconcile(ctx context.Context, eventID uuid.UUID) {
	if s.reconciler == nil {
		return
	}
	if err := s.reconciler.ReconcileEvent(ctx, eventID); err != nil {
		logReconcileFailure(ctx, eventID, err)
	}
}

func optionalHTTPS(field string, value *string) (*string, error) {
	if value == nil || *value == "" {
		return nil, nil
	}
	normalized, err := validateHTTPS(field, *value)
	if err != nil {
		return nil, err
	}
	return &normalized, nil
}
