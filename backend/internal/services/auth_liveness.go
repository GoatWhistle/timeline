package services

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *AuthService) EnsureLive(ctx context.Context, userID, sessionID uuid.UUID) error {
	if userID == uuid.Nil || sessionID == uuid.Nil {
		return models.NewUnauthorized("authentication is required")
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return models.NewUnauthorized("user not found")
		}
		return err
	}
	if !user.IsActive {
		return models.NewForbidden("the account is deactivated")
	}
	session, err := s.sessions.GetByID(ctx, sessionID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return models.NewUnauthorized("the session is no longer valid")
		}
		return err
	}
	if session.UserID != userID || !session.Active(s.now()) {
		return models.NewUnauthorized("the session is no longer valid")
	}
	return nil
}
