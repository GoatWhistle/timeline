package team

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *TeamService) visible(ctx context.Context, actor models.Actor, teamID uuid.UUID,
) (*models.Team, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	existing, err := s.teams.GetByID(ctx, teamID)
	if err != nil {
		return nil, err
	}
	membership, err := s.members.GetByTeamUser(ctx, teamID, actor.UserID)
	switch {
	case errors.Is(err, models.ErrNotFound):
		return nil, models.NewNotFound("team not found")
	case err != nil:
		return nil, err
	case membership.State == models.TeamMemberLeft:
		return nil, models.NewNotFound("team not found")
	}
	return existing, nil
}

func (s *TeamService) leadOnly(ctx context.Context, actor models.Actor, teamID uuid.UUID,
) (*models.Team, error) {
	existing, err := s.visible(ctx, actor, teamID)
	if err != nil {
		return nil, err
	}
	if !existing.LedBy(actor.UserID) {
		return nil, models.NewForbidden("the operation is restricted to the team lead")
	}
	return existing, nil
}

func (s *TeamService) leadOnlyForUpdate(ctx context.Context, actor models.Actor, teamID uuid.UUID,
) (*models.Team, error) {
	if _, err := s.visible(ctx, actor, teamID); err != nil {
		return nil, err
	}
	existing, err := s.teams.GetForUpdate(ctx, teamID)
	if err != nil {
		return nil, err
	}
	if !existing.LedBy(actor.UserID) {
		return nil, models.NewForbidden("the operation is restricted to the team lead")
	}
	return existing, nil
}
