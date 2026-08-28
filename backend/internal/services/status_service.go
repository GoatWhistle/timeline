package services

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/models"
)

type StatusService struct {
	db            *postgres.DB
	statuses      *participation.Statuses
	registrations *participation.Registrations
	participants  *participation.Participants
	events        *event.Events
	users         *identity.Users
	notifier      *NotificationService
	reconciler    Reconciler
	audit         *AuditService
}

func NewStatusService(db *postgres.DB, statuses *participation.Statuses,
	registrations *participation.Registrations, participants *participation.Participants,
	events *event.Events, users *identity.Users,
	notifier *NotificationService, reconciler Reconciler, audit *AuditService) *StatusService {
	return &StatusService{
		db: db, statuses: statuses, registrations: registrations, participants: participants,
		events: events, users: users, notifier: notifier, reconciler: reconciler, audit: audit,
	}
}

func (s *StatusService) List(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	page models.Page) ([]models.RegistrationStatusResponse, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the operation is restricted to administrators")
	}
	return s.statuses.List(ctx, eventID, page)
}

func (s *StatusService) MarkDone(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.RegistrationStatusResponse, error) {
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
	req models.AdminChangeStatusRequest) (*models.RegistrationStatusResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if !req.Status.Valid() {
		return nil, models.NewValidation("invalid status",
			models.FieldError{Field: "status", Message: "allowed values are TODO, DONE and NOT_REQUIRED"})
	}

	var (
		updated   *models.RegistrationStatus
		reconcile uuid.UUID
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		status, err := s.statuses.GetByIDForUpdate(ctx, statusID)
		if err != nil {
			return err
		}
		if status.Status == req.Status {
			updated = status
			return nil
		}

		updated, err = s.statuses.SetStatus(ctx, statusID, req.Status, models.SourceAdmin, actor.UserRef(), req.Note)
		if err != nil {
			return err
		}
		if err := s.notifier.CancelForStatus(ctx, statusID); err != nil {
			return err
		}
		if req.Status == models.StatusTODO {
			reconcile = status.EventID
		}
		return s.audit.Record(ctx, actor, models.AuditStatusChange, models.EntityRegistrationStatus, statusID,
			map[string]any{"status": status.Status, "todo_cycle": status.TodoCycle},
			map[string]any{"status": updated.Status, "todo_cycle": updated.TodoCycle, "note": updated.Note})
	})
	if err != nil {
		return nil, err
	}

	if reconcile != uuid.Nil && s.reconciler != nil {
		if err := s.reconciler.ReconcileEvent(ctx, reconcile); err != nil {
			logReconcileFailure(ctx, reconcile, err)
		}
	}
	return s.response(ctx, updated)
}

func (s *StatusService) BatchSet(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.BatchSetStatusRequest) (*models.BatchResult, error) {
	targets, err := s.batchTargets(ctx, actor, eventID, req)
	if err != nil {
		return nil, err
	}

	result := &models.BatchResult{Results: make([]models.BatchItemResult, 0, len(req.ParticipantIDs))}
	for index, participantID := range req.ParticipantIDs {
		status, ok := targets[participantID]
		if !ok {
			result.Results = append(result.Results, models.BatchItemResult{
				Index: index, Key: participantID.String(), Status: "error",
				Code: "not_found", Message: "participant status not found",
			})
			result.Failed++
			continue
		}
		_, err := s.AdminChange(ctx, actor, status.ID, models.AdminChangeStatusRequest{Status: req.Status, Note: req.Note})
		item := models.BatchItemResult{Index: index, Key: participantID.String()}
		if err == nil {
			id := status.ID
			item.ID = &id
			item.Status = "ok"
		} else {
			var domainErr *models.DomainError
			if errors.As(err, &domainErr) {
				item.Code = domainErr.Code
				item.Message = domainErr.Message
			} else {
				item.Code = "internal_error"
				item.Message = "internal error"
			}
			if errors.Is(err, models.ErrConflict) {
				item.Status = "skipped"
			} else {
				item.Status = "error"
			}
		}
		result.Results = append(result.Results, item)
		countBatch(result, err)
	}
	return result, nil
}

func (s *StatusService) BatchSetPreview(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.BatchSetStatusRequest) (*models.PreviewResponse, error) {
	targets, err := s.batchTargets(ctx, actor, eventID, req)
	if err != nil {
		return nil, err
	}
	preview := &models.PreviewResponse{}
	for _, participantID := range req.ParticipantIDs {
		status, ok := targets[participantID]
		if !ok || status.Status == req.Status {
			preview.Skipped++
			continue
		}
		preview.Affected++
	}
	return preview, nil
}

func (s *StatusService) batchTargets(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.BatchSetStatusRequest) (map[uuid.UUID]*models.RegistrationStatus, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if len(req.ParticipantIDs) == 0 {
		return nil, models.NewValidation("the participant list is empty")
	}
	if req.Status != models.StatusTODO && req.Status != models.StatusNotRequired {
		return nil, models.NewValidation("bulk updates allow only TODO and NOT_REQUIRED",
			models.FieldError{Field: "status", Message: "value is not allowed"})
	}

	registration, err := s.registrations.GetByEvent(ctx, eventID)
	if err != nil {
		return nil, notFoundRegistration(err)
	}

	targets := make(map[uuid.UUID]*models.RegistrationStatus, len(req.ParticipantIDs))
	for _, participantID := range req.ParticipantIDs {
		status, err := s.statuses.GetByParticipant(ctx, registration.ID, participantID)
		if errors.Is(err, models.ErrNotFound) {
			continue
		}
		if err != nil {
			return nil, err
		}
		targets[participantID] = status
	}
	return targets, nil
}

func (s *StatusService) response(ctx context.Context, status *models.RegistrationStatus) (*models.RegistrationStatusResponse, error) {
	resp := &models.RegistrationStatusResponse{
		ID:                  status.ID,
		EventID:             status.EventID,
		RegistrationID:      status.RegistrationID,
		ParticipantID:       status.ParticipantID,
		Status:              status.Status,
		TodoCycle:           status.TodoCycle,
		RegisteredAt:        status.RegisteredAt,
		LastChangeSource:    status.LastChangeSource,
		LastChangedByUserID: status.LastChangedByUserID,
		Note:                status.Note,
		UpdatedAt:           status.UpdatedAt,
	}
	participant, err := s.participants.GetByID(ctx, status.ParticipantID)
	if err != nil {
		return resp, nil
	}
	user, err := s.users.GetByID(ctx, participant.UserID)
	if err != nil {
		return resp, nil
	}
	resp.User = &models.UserSummary{ID: user.ID, DisplayName: user.DisplayName, Email: user.Email, IsActive: user.IsActive}
	return resp, nil
}
