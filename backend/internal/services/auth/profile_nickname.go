package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"

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

func (s *ProfileService) PublicProfile(ctx context.Context, nickname string, viewer *uuid.UUID,
) (dto.PublicProfileResponse, error) {
	var resp dto.PublicProfileResponse
	user, err := s.users.GetByNickname(ctx, nickname)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return resp, publicProfileNotFound()
		}
		return resp, err
	}
	if !user.IsActive || user.Nickname == nil || !profileVisibleTo(user, viewer) {
		return resp, publicProfileNotFound()
	}
	return s.buildPublicProfile(ctx, user, viewer)
}

func (s *ProfileService) buildPublicProfile(ctx context.Context, user *models.User, viewer *uuid.UUID,
) (dto.PublicProfileResponse, error) {
	var resp dto.PublicProfileResponse
	events, err := s.users.PublicProfileEvents(ctx, user.ID)
	if err != nil {
		return resp, err
	}
	links, err := s.links.ListByUser(ctx, user.ID)
	if err != nil {
		return resp, err
	}
	activity, err := s.users.PublicProfileMonthlyActivity(ctx, user.ID, s.now().AddDate(-1, 0, 0))
	if err != nil {
		return resp, err
	}
	pinned, err := s.pinnedFromEvents(ctx, events, user.PinnedEventIDs)
	if err != nil {
		return resp, err
	}
	summary, err := s.summaryFor(ctx, user, viewer)
	if err != nil {
		return resp, err
	}

	return dto.PublicProfileResponse{
		Nickname:        *user.Nickname,
		FirstName:       user.FirstName,
		MiddleName:      user.MiddleName,
		LastName:        user.LastName,
		DisplayName:     user.DisplayName(user.Locale),
		AvatarURL:       user.AvatarURL,
		Bio:             user.Bio,
		MemberSince:     user.CreatedAt,
		Links:           links,
		Events:          events,
		PinnedEvents:    pinned,
		MonthlyActivity: activity,
		Summary:         summary,
	}, nil
}

func (s *ProfileService) summaryFor(ctx context.Context, user *models.User, viewer *uuid.UUID,
) (*dto.PublicProfileSummary, error) {
	owner := viewer != nil && *viewer == user.ID
	viewerIsAdmin := false
	if viewer != nil && !owner {
		viewerUser, err := s.users.GetByID(ctx, *viewer)
		if err == nil {
			viewerIsAdmin = viewerUser.IsAdmin
		}
	}
	if !owner && !viewerIsAdmin {
		return nil, nil
	}
	summary, err := s.users.PublicProfileSummary(ctx, user.ID, true)
	if err != nil {
		return nil, err
	}
	return &summary, nil
}

func (s *ProfileService) pinnedFromEvents(ctx context.Context, events []dto.PublicProfileEvent,
	pinnedIDs []uuid.UUID) ([]dto.PublicProfileEvent, error) {
	out := make([]dto.PublicProfileEvent, 0, len(pinnedIDs))
	if len(pinnedIDs) == 0 {
		return out, nil
	}
	labels, err := s.events.LabelsByIDs(ctx, pinnedIDs)
	if err != nil {
		return nil, err
	}
	for _, id := range pinnedIDs {
		label, ok := labels[id]
		if !ok {
			continue
		}
		for _, e := range events {
			if e.ID == label.DisplayID {
				out = append(out, e)
				break
			}
		}
	}
	return out, nil
}

func profileVisibleTo(owner *models.User, viewer *uuid.UUID) bool {
	if viewer != nil && *viewer == owner.ID {
		return true
	}
	switch owner.ProfileVisibility {
	case models.ProfilePublicVisibility:
		return true
	case models.ProfileMembersVisibility:
		return viewer != nil
	default:
		return false
	}
}

func publicProfileNotFound() error {
	return models.NewNotFound("profile not found")
}
