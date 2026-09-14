package participation

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *ParticipantService) UpdateTeamRole(ctx context.Context, actor models.Actor, participantID uuid.UUID,
	role *string) (*dto.ParticipantResponse, error) {
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
		teamRole, err := validation.ValidateTeamRole(event.Kind, role)
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

func (s *ParticipantService) response(ctx context.Context, p *models.EventParticipant,
) (*dto.ParticipantResponse, error) {
	user, err := s.users.GetByID(ctx, p.UserID)
	if err != nil {
		return nil, err
	}
	eventDisplayID, err := s.events.DisplayIDByID(ctx, p.EventID)
	if err != nil {
		return nil, err
	}
	resp := &dto.ParticipantResponse{
		ID:                  p.DisplayID,
		EventID:             eventDisplayID,
		User:                userSummary(user),
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
	resp.RegistrationStatus = &dto.RegistrationStatusShort{
		ID: status.DisplayID, Status: status.Status, TodoCycle: status.TodoCycle,
		RegisteredAt: status.RegisteredAt, Note: status.Note,
	}
	return resp, nil
}

func userSummary(user *models.User) dto.UserSummary {
	summary := dto.UserSummary{
		ID: user.DisplayID, FirstName: user.FirstName, MiddleName: user.MiddleName,
		LastName: user.LastName, Nickname: user.Nickname,
		Email: user.Email, IsActive: user.IsActive,
	}
	summary.Fill(user.Locale)
	return summary
}
