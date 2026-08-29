package participation

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared"
)

func (s *ParticipantService) UpdateTeamRole(ctx context.Context, actor models.Actor, participantID uuid.UUID,
	role *string) (*models.ParticipantResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}

	var updated *models.EventParticipant
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.participants.GetForUpdate(ctx, participantID)
		if err != nil {
			return err
		}
		event, err := s.events.GetByID(ctx, before.EventID)
		if err != nil {
			return err
		}
		teamRole, err := shared.ValidateTeamRole(event.Kind, role)
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
	role *string) (*models.ParticipantResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}

	var participant *models.EventParticipant
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		existing, err := s.participants.GetForUpdate(ctx, participantID)
		if err != nil {
			return err
		}
		if existing.Assigned() {
			return models.NewConflict("already_assigned", "the participant is already assigned")
		}
		event, err := s.events.GetByID(ctx, existing.EventID)
		if err != nil {
			return err
		}
		teamRole, err := shared.ValidateTeamRole(event.Kind, role)
		if err != nil {
			return err
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
	overrides := make(map[uuid.UUID]*string, len(req.Overrides))
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

func (s *ParticipantService) response(ctx context.Context, p *models.EventParticipant,
) (*models.ParticipantResponse, error) {
	user, err := s.users.GetByID(ctx, p.UserID)
	if err != nil {
		return nil, err
	}
	resp := &models.ParticipantResponse{
		ID:      p.ID,
		EventID: p.EventID,
		User: models.UserSummary{
			ID: user.ID, DisplayName: user.DisplayName,
			Email: user.Email, IsActive: user.IsActive,
		},
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
