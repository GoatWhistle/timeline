package team

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *TeamService) Invite(ctx context.Context, actor models.Actor, teamID, userID uuid.UUID,
) (*dto.TeamDetailResponse, error) {
	var existing *models.Team
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		var err error
		existing, err = s.leadOnly(ctx, actor, teamID)
		if err != nil {
			return err
		}
		invitee, err := s.users.GetByID(ctx, userID)
		if err != nil {
			return models.NewNotFound("user not found")
		}
		if !invitee.IsActive {
			return models.NewConflict("user_inactive", "a deactivated user cannot be invited")
		}

		current, err := s.members.GetByTeamUser(ctx, teamID, userID)
		switch {
		case err == nil && current.State != models.TeamMemberLeft:
			return models.NewConflict("already_member", "the user is already in the team")
		case err != nil && !errors.Is(err, models.ErrNotFound):
			return err
		}

		member, err := s.members.Invite(ctx, teamID, userID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamInvite, models.EntityTeamMember, member.ID, nil,
			map[string]any{"team_id": teamID, "user_id": userID, "state": member.State})
	})
	if err != nil {
		return nil, err
	}
	return s.detail(ctx, actor, existing)
}

func (s *TeamService) Accept(ctx context.Context, actor models.Actor, teamID uuid.UUID,
) (*dto.TeamDetailResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}

	var existing *models.Team
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		var err error
		existing, err = s.teams.GetByID(ctx, teamID)
		if err != nil {
			return err
		}
		current, err := s.members.GetByTeamUser(ctx, teamID, actor.UserID)
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewNotFound("team not found")
			}
			return err
		}
		if current.State == models.TeamMemberLeft {
			return models.NewNotFound("team not found")
		}
		if current.Active() {
			return nil
		}

		member, err := s.members.Accept(ctx, current.ID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamJoin, models.EntityTeamMember, member.ID,
			map[string]any{"state": models.TeamMemberInvited},
			map[string]any{"state": member.State, "team_id": teamID})
	})
	if err != nil {
		return nil, err
	}
	return s.detail(ctx, actor, existing)
}

func (s *TeamService) Leave(ctx context.Context, actor models.Actor, teamID uuid.UUID) error {
	if actor.IsSystem() {
		return models.NewUnauthorized("authentication is required")
	}

	return s.db.WithTx(ctx, func(ctx context.Context) error {
		existing, err := s.teams.GetForUpdate(ctx, teamID)
		if err != nil {
			return err
		}
		current, err := s.members.GetByTeamUser(ctx, teamID, actor.UserID)
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewNotFound("team not found")
			}
			return err
		}
		if current.State == models.TeamMemberLeft {
			return models.NewNotFound("team not found")
		}
		if existing.LedBy(actor.UserID) {
			return models.NewStateTransition("the team lead cannot leave their own team")
		}

		member, err := s.members.Leave(ctx, current.ID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamLeave, models.EntityTeamMember, member.ID,
			map[string]any{"state": current.State},
			map[string]any{"state": member.State, "team_id": teamID})
	})
}

func (s *TeamService) Remove(ctx context.Context, actor models.Actor, teamID, userID uuid.UUID,
) (*dto.TeamDetailResponse, error) {
	var existing *models.Team
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		var err error
		existing, err = s.leadOnlyForUpdate(ctx, actor, teamID)
		if err != nil {
			return err
		}
		if existing.LedBy(userID) {
			return models.NewStateTransition("the team lead cannot be removed from their own team")
		}
		current, err := s.members.GetByTeamUser(ctx, teamID, userID)
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewNotFound("team member not found")
			}
			return err
		}
		if current.State == models.TeamMemberLeft {
			return models.NewConflict("already_removed", "the member has already left the team")
		}

		member, err := s.members.Leave(ctx, current.ID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamLeave, models.EntityTeamMember, member.ID,
			map[string]any{"state": current.State},
			map[string]any{"state": member.State, "team_id": teamID, "removed_by_lead": true})
	})
	if err != nil {
		return nil, err
	}
	return s.detail(ctx, actor, existing)
}
