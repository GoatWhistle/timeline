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

type ParticipantService struct {
	db            *postgres.DB
	participants  *participation.Participants
	events        *event.Events
	registrations *participation.Registrations
	statuses      *participation.Statuses
	users         *identity.Users
	notifier      *NotificationService
	audit         *AuditService
}

func NewParticipantService(db *postgres.DB, participants *participation.Participants,
	events *event.Events, registrations *participation.Registrations,
	statuses *participation.Statuses, users *identity.Users,
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
	event, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}

	result := &models.BatchResult{Results: make([]models.BatchItemResult, 0, len(req.Items))}
	for index, item := range req.Items {
		participant, err := s.addOne(ctx, actor, eventID, event.Kind, item)
		result.Results = append(result.Results, batchItem(index, item.UserID.String(), participant, err))
		countBatch(result, err)
	}
	return result, nil
}

func (s *ParticipantService) addOne(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	kind models.EventKind, item models.AddParticipantItem) (*models.EventParticipant, error) {
	teamRole, err := validateTeamRole(kind, item.TeamRole)
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
