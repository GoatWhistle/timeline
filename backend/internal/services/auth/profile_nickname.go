package auth

import (
	"context"
	"errors"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *ProfileService) checkNickname(ctx context.Context, actor models.Actor,
	patch dto.ProfilePatch) error {
	if patch.Nickname == nil {
		return nil
	}
	taken, err := s.users.NicknameTaken(ctx, *patch.Nickname, actor.UserID)
	if err != nil {
		return err
	}
	if taken {
		return models.NewConflict("nickname_taken", "this nickname is already taken")
	}
	held, err := s.users.NicknameHeld(ctx, *patch.Nickname, actor.UserID, s.now())
	if err != nil {
		return err
	}
	if held {
		return models.NewConflict("nickname_held",
			"this nickname was released recently and is still reserved")
	}
	return nil
}

func (s *ProfileService) holdPreviousNickname(ctx context.Context, before *models.User,
	patch dto.ProfilePatch) error {
	if before.Nickname == nil {
		return nil
	}
	changed := patch.ClearNickname ||
		(patch.Nickname != nil &&
			models.NormalizeNickname(*patch.Nickname) != models.NormalizeNickname(*before.Nickname))
	if !changed {
		return nil
	}
	return s.users.ReserveNickname(ctx, *before.Nickname, before.ID,
		s.now().Add(s.cfg.Auth.NicknameHoldTTL))
}

func (s *ProfileService) PublicProfile(ctx context.Context, nickname string,
) (dto.PublicProfileResponse, error) {
	var resp dto.PublicProfileResponse
	user, err := s.users.GetByNickname(ctx, nickname)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return resp, publicProfileNotFound()
		}
		return resp, err
	}
	if !user.ProfilePublic || !user.IsActive || user.Nickname == nil {
		return resp, publicProfileNotFound()
	}
	events, err := s.users.PublicProfileEvents(ctx, user.ID)
	if err != nil {
		return resp, err
	}
	return dto.PublicProfileResponse{
		Nickname:    *user.Nickname,
		FirstName:   user.FirstName,
		MiddleName:  user.MiddleName,
		LastName:    user.LastName,
		DisplayName: user.DisplayName(user.Locale),
		AvatarURL:   user.AvatarURL,
		Bio:         user.Bio,
		Events:      events,
	}, nil
}

func publicProfileNotFound() error {
	return models.NewNotFound("profile not found")
}
