package services

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type ParticipantService struct {
	db            *repositories.DB
	participants  *repositories.ParticipantRepository
	events        *repositories.EventRepository
	registrations *repositories.RegistrationRepository
	statuses      *repositories.StatusRepository
	users         *repositories.UserRepository
	notifier      *NotificationService
	audit         *AuditService
}

func NewParticipantService(db *repositories.DB, participants *repositories.ParticipantRepository,
	events *repositories.EventRepository, registrations *repositories.RegistrationRepository,
	statuses *repositories.StatusRepository, users *repositories.UserRepository,
	notifier *NotificationService, audit *AuditService) *ParticipantService {
	return &ParticipantService{
		db: db, participants: participants, events: events, registrations: registrations,
		statuses: statuses, users: users, notifier: notifier, audit: audit,
	}
}

func (s *ParticipantService) List(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	filter models.ParticipantFilter, page models.Page) ([]models.ParticipantResponse, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the participant roster is restricted to administrators")
	}
	return s.participants.List(ctx, eventID, filter, page)
}

func (s *ParticipantService) AddMany(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.AddParticipantsRequest) (*models.BatchResult, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if len(req.Items) == 0 {
		return nil, models.NewValidation("the participant list is empty")
	}
	if _, err := s.events.GetByID(ctx, eventID); err != nil {
		return nil, err
	}

	result := &models.BatchResult{Results: make([]models.BatchItemResult, 0, len(req.Items))}
	for index, item := range req.Items {
		participant, err := s.addOne(ctx, actor, eventID, item)
		result.Results = append(result.Results, batchItem(index, item.UserID.String(), participant, err))
		countBatch(result, err)
	}
	return result, nil
}

func (s *ParticipantService) addOne(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	item models.AddParticipantItem) (*models.EventParticipant, error) {
	teamRole, err := validateText("team_role", item.TeamRole, 1, 80)
	if err != nil {
		return nil, err
	}

	var participant *models.EventParticipant
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		user, err := s.users.GetByID(ctx, item.UserID)
		if err != nil {
			return models.NewNotFound("user not found")
		}
		if !user.IsActive {
			return models.NewConflict("user_inactive", "a deactivated user cannot be assigned")
		}

		existing, err := s.participants.GetByEventUser(ctx, eventID, item.UserID)
		switch {
		case err == nil && existing.Assigned():
			return models.NewConflict("already_assigned", "the participant is already assigned to the event")
		case err == nil:
			participant, err = s.participants.Reactivate(ctx, existing.ID, teamRole)
			if err != nil {
				return err
			}
			if err := s.audit.Record(ctx, actor, models.AuditParticipantReactive, models.EntityParticipant,
				participant.ID, map[string]any{"participation_status": models.ParticipationRemoved},
				map[string]any{"participation_status": models.ParticipationAssigned, "team_role": teamRole}); err != nil {
				return err
			}
		case errors.Is(err, models.ErrNotFound):
			participant, err = s.participants.Create(ctx, eventID, item.UserID, teamRole)
			if err != nil {
				return err
			}
			if err := s.audit.Record(ctx, actor, models.AuditParticipantAdd, models.EntityParticipant,
				participant.ID, nil, map[string]any{"user_id": item.UserID, "team_role": teamRole}); err != nil {
				return err
			}
		default:
			return err
		}

		return s.ensureStatusAndNotification(ctx, eventID, participant, user)
	})
	if err != nil {
		return nil, err
	}
	return participant, nil
}

func (s *ParticipantService) ensureStatusAndNotification(ctx context.Context, eventID uuid.UUID,
	participant *models.EventParticipant, user *models.User) error {
	registration, err := s.registrations.GetByEvent(ctx, eventID)
	if errors.Is(err, models.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if !registration.Active() {
		return nil
	}

	status, _, err := s.statuses.EnsureForParticipant(ctx, eventID, registration.ID, participant.ID)
	if err != nil {
		return err
	}
	if status.Status != models.StatusTODO {
		return nil
	}

	event, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return err
	}
	if !event.Schedulable() {
		return nil
	}

	candidate := buildCandidate(event, registration, participant, status.ID, status.TodoCycle, user)
	_, _, err = s.notifier.CreatePrimary(ctx, candidate)
	return err
}

func (s *ParticipantService) RemoveMany(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.RemoveParticipantsRequest) (*models.BatchResult, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if len(req.ParticipantIDs) == 0 {
		return nil, models.NewValidation("the participant list is empty")
	}

	result := &models.BatchResult{Results: make([]models.BatchItemResult, 0, len(req.ParticipantIDs))}
	for index, id := range req.ParticipantIDs {
		var participant *models.EventParticipant
		err := s.db.WithTx(ctx, func(ctx context.Context) error {
			existing, err := s.participants.GetForUpdate(ctx, id)
			if err != nil {
				return err
			}
			if existing.EventID != eventID {
				return models.NewNotFound("participant not found on this event")
			}
			if !existing.Assigned() {
				return models.NewConflict("already_removed", "the participant has already been removed")
			}
			participant, err = s.participants.Remove(ctx, id)
			if err != nil {
				return err
			}
			if err := s.notifier.CancelForParticipant(ctx, id); err != nil {
				return err
			}
			return s.audit.Record(ctx, actor, models.AuditParticipantRemove, models.EntityParticipant, id,
				map[string]any{"participation_status": models.ParticipationAssigned},
				map[string]any{"participation_status": models.ParticipationRemoved})
		})
		result.Results = append(result.Results, batchItem(index, id.String(), participant, err))
		countBatch(result, err)
	}
	return result, nil
}

func (s *ParticipantService) UpdateTeamRole(ctx context.Context, actor models.Actor, participantID uuid.UUID,
	role string) (*models.ParticipantResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	teamRole, err := validateText("team_role", role, 1, 80)
	if err != nil {
		return nil, err
	}

	var updated *models.EventParticipant
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.participants.GetForUpdate(ctx, participantID)
		if err != nil {
			return err
		}
		updated, err = s.participants.UpdateTeamRole(ctx, participantID, teamRole)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamRoleChange, models.EntityParticipant, participantID,
			map[string]any{"team_role": before.TeamRole}, map[string]any{"team_role": updated.TeamRole})
	})
	if err != nil {
		return nil, err
	}
	return s.response(ctx, updated)
}

func (s *ParticipantService) Reactivate(ctx context.Context, actor models.Actor, participantID uuid.UUID,
	role string) (*models.ParticipantResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	teamRole, err := validateText("team_role", role, 1, 80)
	if err != nil {
		return nil, err
	}

	var participant *models.EventParticipant
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		existing, err := s.participants.GetForUpdate(ctx, participantID)
		if err != nil {
			return err
		}
		if existing.Assigned() {
			return models.NewConflict("already_assigned", "the participant is already assigned")
		}
		user, err := s.users.GetByID(ctx, existing.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			return models.NewConflict("user_inactive", "a deactivated user cannot be restored")
		}

		participant, err = s.participants.Reactivate(ctx, participantID, teamRole)
		if err != nil {
			return err
		}
		if err := s.audit.Record(ctx, actor, models.AuditParticipantReactive, models.EntityParticipant,
			participantID, map[string]any{"participation_status": models.ParticipationRemoved},
			map[string]any{"participation_status": models.ParticipationAssigned, "team_role": teamRole}); err != nil {
			return err
		}
		return s.ensureStatusAndNotification(ctx, existing.EventID, participant, user)
	})
	if err != nil {
		return nil, err
	}
	return s.response(ctx, participant)
}

func (s *ParticipantService) CopyFrom(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.CopyParticipantsRequest) (*models.BatchResult, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if req.SourceEventID == eventID {
		return nil, models.NewValidation("source and target events are the same")
	}
	if _, err := s.events.GetByID(ctx, req.SourceEventID); err != nil {
		return nil, models.NewNotFound("source event not found")
	}
	if _, err := s.events.GetByID(ctx, eventID); err != nil {
		return nil, err
	}

	source, err := s.participants.ListAssigned(ctx, req.SourceEventID)
	if err != nil {
		return nil, err
	}
	overrides := make(map[uuid.UUID]string, len(req.Overrides))
	for _, o := range req.Overrides {
		overrides[o.UserID] = o.TeamRole
	}

	items := make([]models.AddParticipantItem, 0, len(source))
	for _, p := range source {
		role := p.TeamRole
		if custom, ok := overrides[p.UserID]; ok {
			role = custom
		}
		items = append(items, models.AddParticipantItem{UserID: p.UserID, TeamRole: role})
	}
	if len(items) == 0 {
		return &models.BatchResult{Results: []models.BatchItemResult{}}, nil
	}
	return s.AddMany(ctx, actor, eventID, models.AddParticipantsRequest{Items: items})
}

func (s *ParticipantService) response(ctx context.Context, p *models.EventParticipant) (*models.ParticipantResponse, error) {
	user, err := s.users.GetByID(ctx, p.UserID)
	if err != nil {
		return nil, err
	}
	resp := &models.ParticipantResponse{
		ID:                  p.ID,
		EventID:             p.EventID,
		User:                models.UserSummary{ID: user.ID, DisplayName: user.DisplayName, Email: user.Email, IsActive: user.IsActive},
		TeamRole:            p.TeamRole,
		ParticipationStatus: p.ParticipationStatus,
		AssignmentVersion:   p.AssignmentVersion,
		AssignedAt:          p.AssignedAt,
		RemovedAt:           p.RemovedAt,
	}

	registration, err := s.registrations.GetByEvent(ctx, p.EventID)
	if errors.Is(err, models.ErrNotFound) {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	status, err := s.statuses.GetByParticipant(ctx, registration.ID, p.ID)
	if errors.Is(err, models.ErrNotFound) {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	resp.RegistrationStatus = &models.RegistrationStatusShort{
		ID: status.ID, Status: status.Status, TodoCycle: status.TodoCycle,
		RegisteredAt: status.RegisteredAt, Note: status.Note,
	}
	return resp, nil
}

func batchItem(index int, key string, participant *models.EventParticipant, err error) models.BatchItemResult {
	item := models.BatchItemResult{Index: index, Key: key}
	if err == nil {
		item.Status = "ok"
		if participant != nil {
			id := participant.ID
			item.ID = &id
		}
		return item
	}

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
	return item
}

func countBatch(result *models.BatchResult, err error) {
	switch {
	case err == nil:
		result.Succeeded++
	case errors.Is(err, models.ErrConflict):
		result.Skipped++
	default:
		result.Failed++
	}
}
