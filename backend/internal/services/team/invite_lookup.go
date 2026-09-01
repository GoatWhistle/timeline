package team

import (
	"context"
	"errors"
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *TeamService) resolveInvitee(ctx context.Context, req dto.InviteTeamMemberRequest,
) (*models.User, error) {
	identities := []*string{req.UserID, req.Nickname, req.Email}
	provided := 0
	for _, value := range identities {
		if value != nil && strings.TrimSpace(*value) != "" {
			provided++
		}
	}
	if provided != 1 {
		return nil, models.NewValidation("exactly one identity is expected",
			models.FieldError{Field: "user_id",
				Message: "provide exactly one of user_id, nickname and email"})
	}

	switch {
	case filled(req.Nickname):
		return s.byNickname(ctx, *req.Nickname)
	case filled(req.Email):
		return s.byEmail(ctx, *req.Email)
	default:
		return s.byDisplayID(ctx, *req.UserID)
	}
}

func filled(value *string) bool {
	return value != nil && strings.TrimSpace(*value) != ""
}

func (s *TeamService) byDisplayID(ctx context.Context, raw string) (*models.User, error) {
	parsed, err := dto.ParseDisplayID(dto.DisplayKindUser, strings.TrimSpace(raw))
	if err != nil {
		return nil, err
	}
	id, err := s.users.ResolveDisplayID(ctx, parsed.Value)
	if err != nil {
		return nil, models.NewNotFound(unknownInvitee)
	}
	return s.users.GetByID(ctx, id)
}

func (s *TeamService) byNickname(ctx context.Context, raw string) (*models.User, error) {
	nickname := models.NormalizeNickname(raw)
	if !models.NicknameFormatValid(nickname) {
		return nil, models.NewValidation("invalid nickname",
			models.FieldError{Field: "nickname", Message: "a nickname of 3 to 39 characters is expected"})
	}
	user, err := s.users.GetByNickname(ctx, nickname)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewNotFound(unknownInvitee)
		}
		return nil, err
	}
	return user, nil
}

func (s *TeamService) byEmail(ctx context.Context, raw string) (*models.User, error) {
	email, err := validation.ValidateEmail("email", raw)
	if err != nil {
		return nil, err
	}
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewNotFound(unknownInvitee)
		}
		return nil, err
	}
	return user, nil
}

const unknownInvitee = "no account matches this identity; " +
	"an administrator invites a person who is not on the platform yet"
