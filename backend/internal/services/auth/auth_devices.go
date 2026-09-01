package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *AuthService) ListSessions(ctx context.Context, actor models.Actor) ([]dto.SessionResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	sessions, err := s.sessions.ListActiveForUser(ctx, actor.UserID, s.now())
	if err != nil {
		return nil, err
	}
	items := make([]dto.SessionResponse, 0, len(sessions))
	for i := range sessions {
		items = append(items, sessionResponse(&sessions[i], actor.SessionID))
	}
	return items, nil
}

func sessionResponse(session *models.Session, current uuid.UUID) dto.SessionResponse {
	return dto.SessionResponse{
		ID:         session.DisplayID,
		UserAgent:  session.UserAgent,
		IP:         session.IP,
		Label:      session.Label,
		Current:    session.ID == current,
		CreatedAt:  session.CreatedAt,
		LastUsedAt: session.LastUsedAt,
		ExpiresAt:  session.ExpiresAt,
	}
}

func (s *AuthService) RenameSession(ctx context.Context, actor models.Actor, sessionID uuid.UUID,
	req dto.UpdateSessionRequest) (dto.SessionResponse, error) {
	if actor.IsSystem() {
		return dto.SessionResponse{}, models.NewUnauthorized("authentication is required")
	}
	patch, err := validation.SessionPatch(req)
	if err != nil {
		return dto.SessionResponse{}, err
	}
	if !patch.LabelSet {
		return dto.SessionResponse{}, models.NewValidation("nothing to change",
			models.FieldError{Field: "label", Message: "a label or clear_label is required"})
	}
	session, err := s.sessions.GetByID(ctx, sessionID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return dto.SessionResponse{}, models.NewNotFound("session not found")
		}
		return dto.SessionResponse{}, err
	}
	if session.UserID != actor.UserID {
		return dto.SessionResponse{}, models.NewNotFound("session not found")
	}
	renamed, err := s.sessions.UpdateLabel(ctx, actor.UserID, session.ID, patch.Label)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return dto.SessionResponse{}, models.NewNotFound("session not found")
		}
		return dto.SessionResponse{}, err
	}
	return sessionResponse(renamed, actor.SessionID), nil
}

func (s *AuthService) ResolveSessionDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.sessions.ResolveDisplayID(ctx, displayID)
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
