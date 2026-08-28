package services

import (
	"context"
	"errors"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, HashSecret(token), models.TokenEmailVerification, s.now())
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewValidation("the confirmation token is invalid or has expired")
			}
			return err
		}
		if record.UserID == nil {
			return models.NewValidation("the confirmation token is invalid")
		}
		return s.users.SetEmailVerified(ctx, *record.UserID)
	})
}

func (s *AuthService) ResendVerification(ctx context.Context, email string) error {
	normalized := normalizeEmail(email)
	if !s.limiter.Allow("resend|"+normalized, s.cfg.RateLim.ResendAttempts, s.cfg.RateLim.ResendWindow) {
		return models.NewRateLimited("too many requests, try again later")
	}

	user, err := s.users.GetByEmail(ctx, normalized)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil
		}
		return err
	}
	if user.EmailVerified() || !user.IsActive {
		return nil
	}

	secret, err := NewSecret()
	if err != nil {
		return err
	}
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.tokens.InvalidateForUser(ctx, user.ID, models.TokenEmailVerification); err != nil {
			return err
		}
		_, err := s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:    &user.ID,
			Purpose:   models.TokenEmailVerification,
			TokenHash: HashSecret(secret),
			ExpiresAt: s.now().Add(s.cfg.Auth.EmailVerifyTTL),
		})
		return err
	})
	if err != nil {
		return err
	}
	s.mailer.SendVerification(ctx, user.Email, user.DisplayName, user.Locale, secret, s.cfg.Auth.EmailVerifyTTL)
	return nil
}

func (s *AuthService) ConfirmEmailChange(ctx context.Context, token string) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, HashSecret(token), models.TokenEmailChange, s.now())
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewValidation("the confirmation token is invalid or has expired")
			}
			return err
		}
		if record.UserID == nil || record.TargetEmail == nil {
			return models.NewValidation("the confirmation token is invalid")
		}

		user, err := s.users.GetByID(ctx, *record.UserID)
		if err != nil {
			return err
		}
		taken, err := s.users.EmailTaken(ctx, *record.TargetEmail, user.ID)
		if err != nil {
			return err
		}
		if taken {
			return models.NewConflict("email_taken", "this email is already taken by another account")
		}

		before := map[string]any{"email": user.Email}
		if err := s.users.ApplyPendingEmail(ctx, user.ID, *record.TargetEmail); err != nil {
			return err
		}
		actor := models.Actor{UserID: user.ID}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, user.ID,
			before, map[string]any{"email": *record.TargetEmail})
	})
}
