package services

import (
	"context"
	"errors"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	normalized := normalizeEmail(email)
	if !s.limiter.Allow("reset|"+normalized, s.cfg.RateLim.ResendAttempts, s.cfg.RateLim.ResendWindow) {
		return models.NewRateLimited("too many requests, try again later")
	}

	user, err := s.users.GetByEmail(ctx, normalized)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil
		}
		return err
	}
	if !user.IsActive {
		return nil
	}

	secret, err := NewSecret()
	if err != nil {
		return err
	}
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.tokens.InvalidateForUser(ctx, user.ID, models.TokenPasswordReset); err != nil {
			return err
		}
		_, err := s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:    &user.ID,
			Purpose:   models.TokenPasswordReset,
			TokenHash: HashSecret(secret),
			ExpiresAt: s.now().Add(s.cfg.Auth.PasswordResetTTL),
		})
		return err
	})
	if err != nil {
		return err
	}
	s.mailer.SendPasswordReset(ctx, user.Email, user.DisplayName, user.Locale, secret, s.cfg.Auth.PasswordResetTTL)
	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, token, password string) error {
	if err := validatePassword(password, s.cfg.Auth.MinPasswordLength); err != nil {
		return err
	}
	hash, err := s.hasher.Hash(password)
	if err != nil {
		return err
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, HashSecret(token), models.TokenPasswordReset, s.now())
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewValidation("the recovery token is invalid or has expired")
			}
			return err
		}
		if record.UserID == nil {
			return models.NewValidation("the recovery token is invalid")
		}
		if err := s.users.SetPassword(ctx, *record.UserID, hash); err != nil {
			return err
		}
		return s.sessions.RevokeAllForUser(ctx, *record.UserID)
	})
}
