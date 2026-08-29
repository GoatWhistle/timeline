package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *AuthService) ListSessions(ctx context.Context, actor models.Actor) ([]models.SessionResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	sessions, err := s.sessions.ListActiveForUser(ctx, actor.UserID, s.now())
	if err != nil {
		return nil, err
	}
	items := make([]models.SessionResponse, 0, len(sessions))
	for i := range sessions {
		items = append(items, sessionResponse(&sessions[i], actor.SessionID))
	}
	return items, nil
}

func sessionResponse(session *models.Session, current uuid.UUID) models.SessionResponse {
	return models.SessionResponse{
		ID:         session.ID,
		UserAgent:  session.UserAgent,
		IP:         session.IP,
		Current:    session.ID == current,
		CreatedAt:  session.CreatedAt,
		LastUsedAt: session.LastUsedAt,
		ExpiresAt:  session.ExpiresAt,
	}
}

func (s *AuthService) RevokeSession(ctx context.Context, actor models.Actor,
	sessionID uuid.UUID) (bool, error) {
	if actor.IsSystem() {
		return false, models.NewUnauthorized("authentication is required")
	}
	session, err := s.sessions.GetByID(ctx, sessionID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return false, models.NewNotFound("session not found")
		}
		return false, err
	}
	if session.UserID != actor.UserID {
		return false, models.NewNotFound("session not found")
	}
	if err := s.sessions.Revoke(ctx, session.ID); err != nil {
		return false, err
	}
	s.dropSession(session.ID)
	return session.ID == actor.SessionID, nil
}
