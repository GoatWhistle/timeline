package auth

import (
	"context"
	"errors"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, crypto.HashSecret(token), models.PurposeEmailVerification, s.now())
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
	normalized := validation.NormalizeEmail(email)
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

	secret, err := crypto.NewSecret()
	if err != nil {
		return err
	}
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.tokens.InvalidateForUser(ctx, user.ID, models.PurposeEmailVerification); err != nil {
			return err
		}
		_, err := s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:    &user.ID,
			Purpose:   models.PurposeEmailVerification,
			TokenHash: crypto.HashSecret(secret),
			ExpiresAt: s.now().Add(s.cfg.Auth.EmailVerifyTTL),
		})
		return err
	})
	if err != nil {
		return err
	}
	s.mailer.SendVerification(ctx, user.Email, user.DisplayName(user.Locale), user.Locale, string(user.Theme),
		secret, s.cfg.Auth.EmailVerifyTTL, telegramRecipient(user))
	return nil
}

func telegramRecipient(user *models.User) mail.TelegramRecipient {
	if user.TelegramChatID == nil {
		return mail.TelegramRecipient{}
	}
	return mail.TelegramRecipient{
		ChatID:  *user.TelegramChatID,
		Enabled: user.NotificationChannels.Has(models.ChannelTelegram),
	}
}

func (s *AuthService) CancelEmailChange(ctx context.Context, token string) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, crypto.HashSecret(token), models.PurposeEmailChangeCancel, s.now())
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewValidation("the cancellation token is invalid or has expired")
			}
			return err
		}
		if record.UserID == nil || record.OriginEmail == nil {
			return models.NewValidation("the cancellation token is invalid")
		}

		user, err := s.users.GetByID(ctx, *record.UserID)
		if err != nil {
			return err
		}
		if err := s.tokens.InvalidateForUser(ctx, user.ID, models.PurposeEmailChange); err != nil {
			return err
		}
		if !emailChangeCancelReverts(user.Email, *record.OriginEmail) {
			return nil
		}

		before := map[string]any{"email": user.Email, "pending_email": user.PendingEmail}
		if err := s.users.RevertEmail(ctx, user.ID, *record.OriginEmail); err != nil {
			return err
		}
		actor := models.Actor{UserID: user.ID}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, user.ID,
			before, map[string]any{"email": *record.OriginEmail, "pending_email": nil})
	})
}

func emailChangeCancelReverts(currentEmail, originEmail string) bool {
	return currentEmail != validation.NormalizeEmail(originEmail)
}

func (s *AuthService) ConfirmEmailChange(ctx context.Context, token string) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, crypto.HashSecret(token), models.PurposeEmailChange, s.now())
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
