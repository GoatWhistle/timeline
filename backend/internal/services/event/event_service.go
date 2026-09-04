package event

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/reconcile"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type Reconciler interface {
	ReconcileEvent(ctx context.Context, eventID uuid.UUID) error
}

type EventService struct {
	db            *postgres.DB
	events        *event.Events
	tracks        *event.Tracks
	registrations *participation.Registrations
	notifier      Notifier
	reconciler    Reconciler
	covers        Covers
	audit         *audit.AuditService
	now           func() time.Time
}

func NewEventService(db *postgres.DB, events *event.Events, tracks *event.Tracks,
	registrations *participation.Registrations, notifier Notifier,
	reconciler Reconciler, audit *audit.AuditService) *EventService {
	return &EventService{
		db: db, events: events, tracks: tracks, registrations: registrations, notifier: notifier,
		reconciler: reconciler, audit: audit, now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *EventService) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.events.ResolveDisplayID(ctx, displayID)
}

func (s *EventService) Create(ctx context.Context, actor models.Actor, req dto.CreateEventRequest,
) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("creating an event is restricted to administrators")
	}
	title, err := validation.ValidateText("title", req.Title, 1, 200)
	if err != nil {
		return nil, err
	}
	if err := (validation.Window{Start: req.StartAt, End: req.EndAt, Subject: "event"}).Validate(); err != nil {
		return nil, err
	}
	website, err := validation.OptionalURL("website_url", req.WebsiteURL)
	if err != nil {
		return nil, err
	}
	place, err := resolvePlace(req.Kind, req.Format, req.Origin, req.CountryCode, req.City, defaultPlace())
	if err != nil {
		return nil, err
	}
	prize, err := resolvePrize(req.PrizePool, req.PrizeCurrency, prizeAmount{})
	if err != nil {
		return nil, err
	}
	if err := validateTeamSize(req.TeamSizeMin, req.TeamSizeMax); err != nil {
		return nil, err
	}

	var created *models.Event
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		created, err = s.events.Create(ctx, &models.Event{
			Title:         title,
			Description:   req.Description,
			Organizer:     req.Organizer,
			WebsiteURL:    website,
			Kind:          place.kind,
			Format:        place.format,
			Origin:        place.origin,
			CountryCode:   place.countryCode,
			City:          place.city,
			PrizePool:     prize.pool,
			PrizeCurrency: prize.currency,
			TeamSizeMin:   req.TeamSizeMin,
			TeamSizeMax:   req.TeamSizeMax,
			StartAt:       req.StartAt.UTC(),
			EndAt:         req.EndAt.UTC(),
		})
		if err != nil {
			return err
		}
		claim, err := s.AssignColor(ctx, created.ID, created.Origin)
		if err != nil {
			return err
		}
		if claim != nil {
			created.ColorSlot, created.ColorAssignedAt = &claim.Slot, &claim.AssignedAt
		}
		return s.audit.Record(ctx, actor, models.AuditEventCreate, models.EntityEvent, created.ID, nil,
			map[string]any{"title": created.Title, "start_at": created.StartAt, "end_at": created.EndAt})
	})
	if err != nil {
		return nil, err
	}
	s.refreshCover(ctx, created.ID, created.WebsiteURL)
	return created, nil
}

func (s *EventService) Get(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	found, err := s.events.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return found, s.loadTracks(ctx, []models.Event{*found}, found)
}

func (s *EventService) loadTracks(ctx context.Context, items []models.Event,
	single *models.Event) error {
	if len(items) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, 0, len(items))
	for i := range items {
		ids = append(ids, items[i].ID)
	}
	byEvent, err := s.tracks.ListByEvents(ctx, ids)
	if err != nil {
		return err
	}
	if single != nil {
		single.Tracks = byEvent[single.ID]
		return nil
	}
	for i := range items {
		items[i].Tracks = byEvent[items[i].ID]
	}
	return nil
}

func (s *EventService) List(ctx context.Context, actor models.Actor, filter models.EventFilter,
	page models.Page) ([]models.Event, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the operation is restricted to administrators")
	}
	items, total, err := s.events.List(ctx, filter, page, s.now())
	if err != nil {
		return nil, 0, err
	}
	return items, total, s.loadTracks(ctx, items, nil)
}

func (s *EventService) reconcile(ctx context.Context, eventID uuid.UUID) {
	if s.reconciler == nil {
		return
	}
	if err := s.reconciler.ReconcileEvent(ctx, eventID); err != nil {
		reconcile.LogReconcileFailure(ctx, eventID, err)
	}
}
