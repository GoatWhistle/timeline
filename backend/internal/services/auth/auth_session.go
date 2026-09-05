package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest,
	meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	email := validation.NormalizeEmail(req.Email)
	key := meta.IP + "|" + email
	if !s.limiter.Allow("login|"+key, s.cfg.RateLim.LoginAttempts, s.cfg.RateLim.LoginWindow) {
		return nil, nil, models.NewRateLimited("too many sign-in attempts, try again later")
	}

	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, nil, models.NewUnauthorized("invalid email or password")
		}
		return nil, nil, err
	}
	if !s.hasher.Verify(req.Password, user.PasswordHash) {
		return nil, nil, models.NewUnauthorized("invalid email or password")
	}
	if !user.IsActive {
		return nil, nil, models.NewForbidden("the account is deactivated")
	}

	s.limiter.Reset("login|" + key)
	pair, err := s.startSession(ctx, user, meta)
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string,
	meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	hash := crypto.HashSecret(refreshToken)
	now := s.now()

	if err := s.terminateReplayedChain(ctx, hash); err != nil {
		return nil, nil, err
	}

	var (
		user *models.User
		pair *models.TokenPair
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		session, err := s.sessions.GetByHash(ctx, hash)
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewUnauthorized("session not found")
			}
			return err
		}
		if !session.Active(now) {
			return models.NewUnauthorized("session has expired")
		}

		user, err = s.activeUser(ctx, session.UserID)
		if err != nil {
			return err
		}

		secret, err := crypto.NewSecret()
		if err != nil {
			return err
		}
		next, err := s.sessions.Rotate(ctx, session, &models.Session{
			UserID:           user.ID,
			RefreshTokenHash: crypto.HashSecret(secret),
			DeviceHash:       session.DeviceHash,
			Label:            session.Label,
			UserAgent:        optionalString(meta.UserAgent),
			IP:               optionalString(meta.IP),
			ExpiresAt:        now.Add(s.cfg.Auth.RefreshTTL),
			LastUsedAt:       &now,
		})
		if err != nil {
			return err
		}

		access, expires, err := s.issuer.Issue(user.ID, next.ID, now)
		if err != nil {
			return err
		}
		pair = &models.TokenPair{
			AccessToken:      access,
			AccessExpiresAt:  expires,
			RefreshToken:     secret,
			RefreshExpiresAt: next.ExpiresAt,
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

func (s *AuthService) activeUser(ctx context.Context, id uuid.UUID) (*models.User, error) {
	user, err := s.users.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !user.IsActive {
		return nil, models.NewForbidden("the account is deactivated")
	}
	return user, nil
}

func (s *AuthService) terminateReplayedChain(ctx context.Context, hash string) error {
	session, err := s.sessions.GetByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil
		}
		return err
	}
	if session.RevokedAt == nil {
		return nil
	}
	if err := s.db.WithTx(ctx, func(ctx context.Context) error {
		return s.sessions.RevokeFamily(ctx, session.FamilyID)
	}); err != nil {
		return err
	}
	return models.NewUnauthorized("session revoked: refresh chain terminated")
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	session, err := s.sessions.GetByHash(ctx, crypto.HashSecret(refreshToken))
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil
		}
		return err
	}
	if err := s.sessions.Revoke(ctx, session.ID); err != nil {
		return err
	}
	s.dropSession(session.ID)
	return nil
}

func (s *AuthService) LogoutAll(ctx context.Context, actor models.Actor) error {
	if actor.IsSystem() {
		return models.NewUnauthorized("authentication is required")
	}
	if err := s.sessions.RevokeAllForUser(ctx, actor.UserID); err != nil {
		return err
	}
	s.dropUser(actor.UserID)
	return nil
}

func (s *AuthService) Authenticate(ctx context.Context, accessToken string) (*models.User, uuid.UUID, error) {
	userID, sessionID, err := s.issuer.Parse(accessToken)
	if err != nil {
		return nil, uuid.Nil, err
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, uuid.Nil, models.NewUnauthorized("user not found")
		}
		return nil, uuid.Nil, err
	}
	if !user.IsActive {
		return nil, uuid.Nil, models.NewForbidden("the account is deactivated")
	}
	return user, sessionID, nil
}
