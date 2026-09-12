package auth

import (
	"context"
	"errors"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	normalized := validation.NormalizeEmail(email)
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

	secret, err := crypto.NewSecret()
	if err != nil {
		return err
	}
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.tokens.InvalidateForUser(ctx, user.ID, models.PurposePasswordReset); err != nil {
			return err
		}
		_, err := s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:    &user.ID,
			Purpose:   models.PurposePasswordReset,
			TokenHash: crypto.HashSecret(secret),
			ExpiresAt: s.now().Add(s.cfg.Auth.PasswordResetTTL),
		})
		return err
	})
	if err != nil {
		return err
	}
	s.mailer.SendPasswordReset(ctx, user.Email, user.DisplayName(user.Locale), user.Locale, string(user.Theme),
		secret, s.cfg.Auth.PasswordResetTTL, telegramRecipient(user))
	return nil
}

func (s *AuthService) ChangePassword(ctx context.Context, actor models.Actor,
	req dto.ChangePasswordRequest) error {
	if err := validation.ValidatePassword(req.NewPassword, s.cfg.Auth.MinPasswordLength); err != nil {
		return err
	}
	user, err := s.users.GetByID(ctx, actor.UserID)
	if err != nil {
		return err
	}
	if !s.hasher.Verify(req.CurrentPassword, user.PasswordHash) {
		return models.NewUnauthorized("invalid password")
	}
	hash, err := s.hasher.Hash(req.NewPassword)
	if err != nil {
		return err
	}
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.users.SetPassword(ctx, user.ID, hash); err != nil {
			return err
		}
		return s.sessions.RevokeOthersForUser(ctx, user.ID, actor.SessionID)
	})
	if err != nil {
		return err
	}
	s.mailer.SendPasswordChanged(ctx, user.Email, user.DisplayName(user.Locale), user.Locale, string(user.Theme),
		telegramRecipient(user))
	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, token, password string) error {
	if err := validation.ValidatePassword(password, s.cfg.Auth.MinPasswordLength); err != nil {
		return err
	}
	hash, err := s.hasher.Hash(password)
	if err != nil {
		return err
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, crypto.HashSecret(token), models.PurposePasswordReset, s.now())
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
