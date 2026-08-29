package event

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/query"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/reconcile"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type CatalogService struct {
	db            *postgres.DB
	catalog       *query.Catalog
	events        *event.Events
	participants  *participation.Participants
	registrations *participation.Registrations
	statuses      *participation.Statuses
	users         *identity.Users
	notifier      Notifier
	audit         *audit.AuditService
	now           func() time.Time
}

func NewCatalogService(db *postgres.DB, catalog *query.Catalog,
	events *event.Events, participants *participation.Participants,
	registrations *participation.Registrations, statuses *participation.Statuses,
	users *identity.Users, notifier Notifier, audit *audit.AuditService) *CatalogService {
	return &CatalogService{
		db: db, catalog: catalog, events: events, participants: participants,
		registrations: registrations, statuses: statuses, users: users,
		notifier: notifier, audit: audit, now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *CatalogService) List(ctx context.Context, actor models.Actor, filter models.CatalogFilter,
	page models.Page) ([]models.CatalogEvent, int64, error) {
	if actor.UserID == uuid.Nil {
		return nil, 0, models.NewForbidden("the catalog is available to authenticated users only")
	}
	return s.catalog.List(ctx, actor.UserID, filter, page, s.now())
}

func (s *CatalogService) Join(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.JoinEventRequest) (*models.EventParticipant, error) {
	if actor.UserID == uuid.Nil {
		return nil, models.NewForbidden("joining requires an authenticated user")
	}

	var participant *models.EventParticipant
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		event, err := s.events.GetByID(ctx, eventID)
		if err != nil {
			return err
		}
		if !event.Schedulable() {
			return models.NewNotFound("event not found")
		}
		if event.EndAt.Before(s.now()) {
			return models.NewStateTransition("a finished event cannot be joined")
		}
		teamRole, err := validation.ValidateTeamRole(event.Kind, req.TeamRole)
		if err != nil {
			return err
		}
		user, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			return models.NewConflict("user_inactive", "a deactivated user cannot join")
		}

		participant, err = s.upsert(ctx, actor, eventID, teamRole)
		if err != nil {
			return err
		}
		return s.ensureStatus(ctx, event, participant, user)
	})
	if err != nil {
		return nil, err
	}
	return participant, nil
}

func (s *CatalogService) upsert(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	teamRole *string) (*models.EventParticipant, error) {
	existing, err := s.participants.GetByEventUser(ctx, eventID, actor.UserID)
	switch {
	case err == nil && existing.Assigned():
		return nil, models.NewConflict("already_assigned", "you already take part in this event")
	case err == nil:
		participant, err := s.participants.Reactivate(ctx, existing.ID, teamRole)
		if err != nil {
			return nil, err
		}
		return participant, s.audit.Record(ctx, actor, models.AuditParticipantReactive,
			models.EntityParticipant, participant.ID,
			map[string]any{"participation_status": models.ParticipationRemoved},
			map[string]any{"participation_status": models.ParticipationAssigned,
				"team_role": teamRole, "self_signup": true})
	case errors.Is(err, models.ErrNotFound):
		participant, err := s.participants.Create(ctx, eventID, actor.UserID, teamRole)
		if err != nil {
			return nil, err
		}
		return participant, s.audit.Record(ctx, actor, models.AuditParticipantAdd,
			models.EntityParticipant, participant.ID, nil,
			map[string]any{"user_id": actor.UserID, "team_role": teamRole, "self_signup": true})
	default:
		return nil, err
	}
}

func (s *CatalogService) ensureStatus(ctx context.Context, event *models.Event,
	participant *models.EventParticipant, user *models.User) error {
	registration, err := s.registrations.GetByEvent(ctx, event.ID)
	if errors.Is(err, models.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if !registration.Active() {
		return nil
	}

	status, _, err := s.statuses.EnsureForParticipant(ctx, event.ID, registration.ID, participant.ID)
	if err != nil {
		return err
	}
	if status.Status != models.StatusTODO {
		return nil
	}

	candidate := reconcile.BuildCandidate(event, registration, participant, status.ID, status.TodoCycle, user)
	_, _, err = s.notifier.CreatePrimary(ctx, candidate)
	return err
}
