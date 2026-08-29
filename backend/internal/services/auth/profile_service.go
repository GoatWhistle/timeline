package auth

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type ProfileService struct {
	db       *postgres.DB
	users    *identity.Users
	tokens   *identity.Tokens
	sessions *identity.Sessions
	feeds    *identity.CalendarFeeds
	notifier Notifier
	audit    *audit.AuditService
	hasher   *crypto.PasswordHasher
	mailer   *mail.Mailer
	telegram mail.TelegramSender
	realtime SessionDropper
	cfg      *config.Config
	now      func() time.Time
}

func NewProfileService(db *postgres.DB, users *identity.Users,
	tokens *identity.Tokens, sessions *identity.Sessions,
	notifier Notifier, audit *audit.AuditService, hasher *crypto.PasswordHasher, mailer *mail.Mailer,
	telegram mail.TelegramSender, cfg *config.Config) *ProfileService {
	return &ProfileService{
		db: db, users: users, tokens: tokens, sessions: sessions, notifier: notifier,
		audit: audit, hasher: hasher, mailer: mailer, telegram: telegram, cfg: cfg,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *ProfileService) Get(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	return s.users.GetByID(ctx, userID)
}

func (s *ProfileService) Update(ctx context.Context, actor models.Actor, req models.UpdateProfileRequest,
) (*models.User, error) {
	patch, err := validation.ProfilePatch(req)
	if err != nil {
		return nil, err
	}

	var updated *models.User
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		updated, err = s.users.UpdateProfile(ctx, actor.UserID, patch)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			profileSnapshot(before), profileSnapshot(updated))
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func profileSnapshot(u *models.User) map[string]any {
	return map[string]any{
		"display_name":      u.DisplayName,
		"preferred_channel": u.PreferredChannel,
		"locale":            u.Locale,
		"timezone":          u.Timezone,
		"avatar_url":        u.AvatarURL,
		"github_url":        u.GithubURL,
		"website_url":       u.WebsiteURL,
		"bio_set":           u.Bio != nil,
	}
}

func (s *ProfileService) StartTelegramLink(ctx context.Context, actor models.Actor) (string, time.Time, error) {
	secret, err := crypto.NewSecret()
	if err != nil {
		return "", time.Time{}, err
	}
	expires := s.now().Add(s.cfg.Auth.TelegramLinkTTL)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.tokens.InvalidateForUser(ctx, actor.UserID, models.PurposeTelegramLink); err != nil {
			return err
		}
		_, err := s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:    &actor.UserID,
			Purpose:   models.PurposeTelegramLink,
			TokenHash: crypto.HashSecret(secret),
			ExpiresAt: expires,
		})
		return err
	})
	if err != nil {
		return "", time.Time{}, err
	}
	return s.telegram.DeepLink(secret), expires, nil
}

func (s *ProfileService) UnlinkTelegram(ctx context.Context, actor models.Actor) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.users.ClearTelegram(ctx, actor.UserID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"telegram_linked": true}, map[string]any{"telegram_linked": false})
	})
}

func (s *ProfileService) RequestEmailChange(ctx context.Context, actor models.Actor, req models.ChangeEmailRequest,
) error {
	newEmail, err := validation.ValidateEmail("new_email", req.NewEmail)
	if err != nil {
		return err
	}

	user, err := s.users.GetByID(ctx, actor.UserID)
	if err != nil {
		return err
	}
	if !s.hasher.Verify(req.Password, user.PasswordHash) {
		return models.NewUnauthorized("invalid password")
	}
	if newEmail == user.Email {
		return models.NewValidation("the new email matches the current one")
	}

	secret, err := crypto.NewSecret()
	if err != nil {
		return err
	}
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		taken, err := s.users.EmailTaken(ctx, newEmail, user.ID)
		if err != nil {
			return err
		}
		if taken {
			return models.NewConflict("email_taken", "this email is already taken")
		}
		if err := s.users.SetPendingEmail(ctx, user.ID, newEmail); err != nil {
			return err
		}
		if err := s.tokens.InvalidateForUser(ctx, user.ID, models.PurposeEmailChange); err != nil {
			return err
		}
		_, err = s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:      &user.ID,
			Purpose:     models.PurposeEmailChange,
			TokenHash:   crypto.HashSecret(secret),
			TargetEmail: &newEmail,
			ExpiresAt:   s.now().Add(s.cfg.Auth.EmailVerifyTTL),
		})
		return err
	})
	if err != nil {
		return err
	}

	s.mailer.SendEmailChange(ctx, newEmail, user.DisplayName, user.Locale, secret, s.cfg.Auth.EmailVerifyTTL)
	return nil
}

func (s *ProfileService) Deactivate(ctx context.Context, actor models.Actor) error {
	if err := deactivateUser(ctx, s.db, s.users, s.sessions, s.feeds, s.notifier,
		s.audit, actor, actor.UserID); err != nil {
		return err
	}
	s.dropUser(actor.UserID)
	return nil
}

func deactivateUser(ctx context.Context, db *postgres.DB, users *identity.Users,
	sessions *identity.Sessions, feeds *identity.CalendarFeeds, notifier Notifier,
	audit *audit.AuditService, actor models.Actor, userID uuid.UUID) error {
	return db.WithTx(ctx, func(ctx context.Context) error {
		user, err := users.GetByID(ctx, userID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			return models.NewConflict("already_inactive", "the account is already deactivated")
		}
		if err := users.SetActive(ctx, userID, false); err != nil {
			return err
		}
		if err := sessions.RevokeAllForUser(ctx, userID); err != nil {
			return err
		}
		if feeds != nil {
			if _, err := feeds.RevokeAllForUser(ctx, userID); err != nil {
				return err
			}
		}
		if err := users.ClearTelegram(ctx, userID); err != nil {
			return err
		}
		if err := notifier.CancelForRecipient(ctx, userID); err != nil {
			return err
		}
		return audit.Record(ctx, actor, models.AuditUserDeactivate, models.EntityUser, userID,
			map[string]any{"is_active": true}, map[string]any{"is_active": false})
	})
}
