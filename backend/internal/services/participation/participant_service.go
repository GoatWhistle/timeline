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
)

type ParticipantService struct {
	db            *postgres.DB
	participants  *participation.Participants
	events        *event.Events
	registrations *participation.Registrations
	statuses      *participation.Statuses
	users         *identity.Users
	notifier      Notifier
	audit         *audit.AuditService
}

func NewParticipantService(db *postgres.DB, participants *participation.Participants,
	events *event.Events, registrations *participation.Registrations,
	statuses *participation.Statuses, users *identity.Users,
	notifier Notifier, audit *audit.AuditService) *ParticipantService {
	return &ParticipantService{
		db: db, participants: participants, events: events, registrations: registrations,
		statuses: statuses, users: users, notifier: notifier, audit: audit,
	}
}

func (s *ParticipantService) List(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	filter models.ParticipantFilter, page models.Page) ([]dto.ParticipantResponse, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the participant roster is restricted to administrators")
	}
	return s.participants.List(ctx, eventID, filter, page)
}

func (s *ParticipantService) RemoveMany(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req dto.RemoveParticipantsRequest, participantIDs dto.ResolvedIDs) (*dto.BatchResult, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if len(req.ParticipantIDs) == 0 {
		return nil, models.NewValidation("the participant list is empty")
	}

	result := &dto.BatchResult{Results: make([]dto.BatchItemResult, 0, participantIDs.Len())}
	for index, id := range participantIDs.IDs {
		var participant *models.EventParticipant
		err := unresolved(participantIDs, index)
		if err == nil {
			participant, err = s.removeOne(ctx, actor, eventID, id)
		}
		result.Results = append(result.Results, batchItem(index, req.ParticipantIDs[index], participant, err))
		countBatch(result, err)
	}
	return result, nil
}

func (s *ParticipantService) removeOne(ctx context.Context, actor models.Actor,
	eventID, id uuid.UUID) (*models.EventParticipant, error) {
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
	if err != nil {
		return nil, err
	}
	return participant, nil
}
