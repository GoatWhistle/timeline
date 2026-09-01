package team

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
)

func (s *TeamService) JoinLink(ctx context.Context, actor models.Actor, teamID uuid.UUID,
) (*dto.TeamJoinLinkResponse, error) {
	if _, err := s.leadOnly(ctx, actor, teamID); err != nil {
		return nil, err
	}
	link, err := s.links.Active(ctx, teamID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return &dto.TeamJoinLinkResponse{}, nil
		}
		return nil, err
	}
	if !link.Usable(s.now()) {
		return &dto.TeamJoinLinkResponse{}, nil
	}
	return &dto.TeamJoinLinkResponse{
		ID:        link.DisplayID,
		ExpiresAt: &link.ExpiresAt,
		Active:    true,
	}, nil
}

func (s *TeamService) RotateJoinLink(ctx context.Context, actor models.Actor, teamID uuid.UUID,
) (*dto.TeamJoinLinkSecretResponse, error) {
	secret, err := crypto.NewSecret()
	if err != nil {
		return nil, err
	}

	var link *models.TeamJoinLink
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.leadOnlyForUpdate(ctx, actor, teamID); err != nil {
			return err
		}
		if err := s.links.RevokeActive(ctx, teamID); err != nil {
			return err
		}
		link, err = s.links.Create(ctx, teamID, actor.UserID,
			crypto.HashSecret(secret), s.now().Add(s.joinLinkTTL))
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamLinkIssue, models.EntityTeamJoinLink,
			link.ID, nil, map[string]any{"team_id": teamID, "expires_at": link.ExpiresAt})
	})
	if err != nil {
		return nil, err
	}
	return &dto.TeamJoinLinkSecretResponse{
		ID:        link.DisplayID,
		Token:     secret,
		URL:       s.publicURL + "/team-join/" + secret,
		ExpiresAt: link.ExpiresAt,
	}, nil
}

func (s *TeamService) RevokeJoinLink(ctx context.Context, actor models.Actor, teamID uuid.UUID) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.leadOnlyForUpdate(ctx, actor, teamID); err != nil {
			return err
		}
		link, err := s.links.Active(ctx, teamID)
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewNotFound("the team has no join link")
			}
			return err
		}
		if err := s.links.RevokeActive(ctx, teamID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamLinkRevoke, models.EntityTeamJoinLink,
			link.ID, map[string]any{"team_id": teamID}, nil)
	})
}

func (s *TeamService) JoinByLink(ctx context.Context, actor models.Actor, token string,
) (*dto.TeamDetailResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	secret := strings.TrimSpace(token)
	if secret == "" {
		return nil, models.NewNotFound("the join link is not valid")
	}

	var existing *models.Team
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		link, err := s.links.ByTokenHash(ctx, crypto.HashSecret(secret))
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewNotFound("the join link is not valid")
			}
			return err
		}
		if !link.Usable(s.now()) {
			return models.NewNotFound("the join link is not valid")
		}

		existing, err = s.teams.GetByID(ctx, link.TeamID)
		if err != nil {
			return err
		}
		user, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			return models.NewConflict("user_inactive", "a deactivated user cannot join a team")
		}
		return s.joinThrough(ctx, actor, link)
	})
	if err != nil {
		return nil, err
	}
	return s.detail(ctx, actor, existing)
}

func (s *TeamService) joinThrough(ctx context.Context, actor models.Actor,
	link *models.TeamJoinLink) error {
	current, err := s.members.GetByTeamUser(ctx, link.TeamID, actor.UserID)
	if err != nil && !errors.Is(err, models.ErrNotFound) {
		return err
	}
	if err == nil && current.State == models.TeamMemberActive {
		return nil
	}

	pending := current
	if err != nil || current.State == models.TeamMemberLeft {
		pending, err = s.members.Invite(ctx, link.TeamID, actor.UserID)
		if err != nil {
			return err
		}
	}
	accepted, err := s.members.Accept(ctx, pending.ID)
	if err != nil {
		return err
	}
	return s.recordJoin(ctx, actor, link, accepted)
}

func (s *TeamService) recordJoin(ctx context.Context, actor models.Actor,
	link *models.TeamJoinLink, member *models.TeamMember) error {
	return s.audit.Record(ctx, actor, models.AuditTeamJoin, models.EntityTeamMember, member.ID, nil,
		map[string]any{"team_id": link.TeamID, "state": member.State, "through_join_link": true})
}
