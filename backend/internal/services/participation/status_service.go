package participation

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/reconcile"
)

type StatusService struct {
	db            *postgres.DB
	statuses      *participation.Statuses
	registrations *participation.Registrations
	participants  *participation.Participants
	events        *event.Events
	users         *identity.Users
	notifier      Notifier
	reconciler    Reconciler
	audit         *audit.AuditService
}

func NewStatusService(db *postgres.DB, statuses *participation.Statuses,
	registrations *participation.Registrations, participants *participation.Participants,
	events *event.Events, users *identity.Users,
	notifier Notifier, reconciler Reconciler, audit *audit.AuditService) *StatusService {
	return &StatusService{
		db: db, statuses: statuses, registrations: registrations, participants: participants,
		events: events, users: users, notifier: notifier, reconciler: reconciler, audit: audit,
	}
}

func (s *StatusService) List(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	page models.Page) ([]dto.RegistrationStatusResponse, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the operation is restricted to administrators")
	}
	return s.statuses.List(ctx, eventID, page)
}

func (s *StatusService) MarkDone(ctx context.Context, actor models.Actor, eventID uuid.UUID,
) (*dto.RegistrationStatusResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}

	var updated *models.RegistrationStatus
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		event, err := s.events.GetByID(ctx, eventID)
		if err != nil {
			return err
		}
		if !event.Published() {
			return models.NewNotFound("event not found")
		}
		if event.Archived() {
			return models.NewStateTransition("event is archived")
		}

		participant, err := s.participants.GetByEventUser(ctx, eventID, actor.UserID)
		if err != nil {
			return models.NewNotFound("you are not assigned to this event")
		}
		if !participant.Assigned() {
			return models.NewNotFound("you are not assigned to this event")
		}

		registration, err := s.registrations.GetByEvent(ctx, eventID)
		if err != nil {
			return notFoundRegistration(err)
		}
		if !registration.Active() {
			return models.NewStateTransition("registration is disabled")
		}

		status, err := s.statuses.GetByParticipant(ctx, registration.ID, participant.ID)
		if err != nil {
			return err
		}
		if status.Status == models.StatusDONE {
			updated = status
			return nil
		}
		if status.Status != models.StatusTODO {
			return models.NewStateTransition("only a TODO status can be moved to DONE")
		}

		updated, err = s.statuses.SetStatus(ctx, status.ID, models.StatusDONE, models.SourceUser, actor.UserRef(), nil)
		if err != nil {
			return err
		}
		if err := s.notifier.CancelForStatus(ctx, status.ID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStatusChange, models.EntityRegistrationStatus, status.ID,
			map[string]any{"status": status.Status, "todo_cycle": status.TodoCycle},
			map[string]any{"status": updated.Status, "registered_at": updated.RegisteredAt})
	})
	if err != nil {
		return nil, err
	}
	return s.response(ctx, updated)
}

func (s *StatusService) AdminChange(ctx context.Context, actor models.Actor, statusID uuid.UUID,
	req dto.AdminChangeStatusRequest) (*dto.RegistrationStatusResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if !req.Status.Valid() {
		return nil, models.NewValidation("invalid status",
			models.FieldError{Field: "status", Message: "allowed values are TODO, DONE and NOT_REQUIRED"})
	}

	var updated *models.RegistrationStatus
	var reconcileID uuid.UUID
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		status, err := s.statuses.GetByIDForUpdate(ctx, statusID)
		if err != nil {
			return err
		}
		if status.Status == req.Status {
			updated = status
			return nil
		}
		if !status.Status.AdminCanMoveTo(req.Status) {
			return models.NewStateTransition("an excused participant is returned to TODO before being marked DONE")
		}

		updated, err = s.statuses.SetStatus(ctx, statusID, req.Status, models.SourceAdmin, actor.UserRef(), req.Note)
		if err != nil {
			return err
		}
		if err := s.notifier.CancelForStatus(ctx, statusID); err != nil {
			return err
		}
		if req.Status == models.StatusTODO {
			reconcileID = status.EventID
		}
		return s.audit.Record(ctx, actor, models.AuditStatusChange, models.EntityRegistrationStatus, statusID,
			map[string]any{"status": status.Status, "todo_cycle": status.TodoCycle},
			map[string]any{"status": updated.Status, "todo_cycle": updated.TodoCycle, "note": updated.Note})
	})
	if err != nil {
		return nil, err
	}

	if reconcileID != uuid.Nil && s.reconciler != nil {
		if err := s.reconciler.ReconcileEvent(ctx, reconcileID); err != nil {
			reconcile.LogReconcileFailure(ctx, reconcileID, err)
		}
	}
	return s.response(ctx, updated)
}
