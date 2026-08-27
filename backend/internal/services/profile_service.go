package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type ProfileService struct {
	db       *repositories.DB
	users    *repositories.UserRepository
	tokens   *repositories.TokenRepository
	sessions *repositories.SessionRepository
	notifier *NotificationService
	audit    *AuditService
	hasher   *PasswordHasher
	mailer   *Mailer
	telegram TelegramSender
	cfg      *config.Config
	now      func() time.Time
}

func NewProfileService(db *repositories.DB, users *repositories.UserRepository,
	tokens *repositories.TokenRepository, sessions *repositories.SessionRepository,
	notifier *NotificationService, audit *AuditService, hasher *PasswordHasher, mailer *Mailer,
	telegram TelegramSender, cfg *config.Config) *ProfileService {
	return &ProfileService{
		db: db, users: users, tokens: tokens, sessions: sessions, notifier: notifier,
		audit: audit, hasher: hasher, mailer: mailer, telegram: telegram, cfg: cfg,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *ProfileService) Get(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	return s.users.GetByID(ctx, userID)
}

func (s *ProfileService) Update(ctx context.Context, actor models.Actor, req models.UpdateProfileRequest) (*models.User, error) {
	var (
		displayName *string
		channel     *models.Channel
		clearChan   bool
		username    *string
		clearUser   bool
	)
	if req.DisplayName != nil {
		value, err := validateText("display_name", *req.DisplayName, 1, 120)
		if err != nil {
			return nil, err
		}
		displayName = &value
	}
	if req.PreferredChannel != nil {
		if *req.PreferredChannel == "" {
			clearChan = true
		} else {
			value, err := parseChannel("preferred_channel", *req.PreferredChannel)
			if err != nil {
				return nil, err
			}
			channel = &value
		}
	}
	if req.TelegramUsername != nil {
		if *req.TelegramUsername == "" {
			clearUser = true
		} else {
			value, err := validateText("telegram_username", *req.TelegramUsername, 1, 64)
			if err != nil {
				return nil, err
			}
			username = &value
		}
	}

	var updated *models.User
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		updated, err = s.users.UpdateProfile(ctx, actor.UserID, displayName, username, clearUser, channel, clearChan)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"display_name": before.DisplayName, "preferred_channel": before.PreferredChannel},
			map[string]any{"display_name": updated.DisplayName, "preferred_channel": updated.PreferredChannel})
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *ProfileService) StartTelegramLink(ctx context.Context, actor models.Actor) (string, time.Time, error) {
	secret, err := NewSecret()
	if err != nil {
		return "", time.Time{}, err
	}
	expires := s.now().Add(s.cfg.Auth.TelegramLinkTTL)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.tokens.InvalidateForUser(ctx, actor.UserID, models.TokenTelegramLink); err != nil {
			return err
		}
		_, err := s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:    &actor.UserID,
			Purpose:   models.TokenTelegramLink,
			TokenHash: HashSecret(secret),
			ExpiresAt: expires,
		})
		return err
	})
	if err != nil {
		return "", time.Time{}, err
	}
	return s.telegram.DeepLink(secret), expires, nil
}

func (s *ProfileService) CompleteTelegramLink(ctx context.Context, token, chatID string, username *string) (*models.User, error) {
	var user *models.User
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, HashSecret(token), models.TokenTelegramLink, s.now())
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewValidation("the link is invalid or has expired")
			}
			return err
		}
		if record.UserID == nil {
			return models.NewValidation("the link is invalid")
		}
		if err := s.users.SetTelegram(ctx, *record.UserID, chatID, username); err != nil {
			return err
		}
		user, err = s.users.GetByID(ctx, *record.UserID)
		return err
	})
	if err != nil {
		return nil, err
	}
	return user, nil
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

func (s *ProfileService) RequestEmailChange(ctx context.Context, actor models.Actor, req models.ChangeEmailRequest) error {
	newEmail, err := validateEmail("new_email", req.NewEmail)
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

	secret, err := NewSecret()
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
		if err := s.tokens.InvalidateForUser(ctx, user.ID, models.TokenEmailChange); err != nil {
			return err
		}
		_, err = s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:      &user.ID,
			Purpose:     models.TokenEmailChange,
			TokenHash:   HashSecret(secret),
			TargetEmail: &newEmail,
			ExpiresAt:   s.now().Add(s.cfg.Auth.EmailVerifyTTL),
		})
		return err
	})
	if err != nil {
		return err
	}

	s.mailer.SendEmailChange(ctx, newEmail, user.DisplayName, secret, s.cfg.Auth.EmailVerifyTTL)
	return nil
}

func (s *ProfileService) Deactivate(ctx context.Context, actor models.Actor) error {
	return deactivateUser(ctx, s.db, s.users, s.sessions, s.notifier, s.audit, actor, actor.UserID)
}

func deactivateUser(ctx context.Context, db *repositories.DB, users *repositories.UserRepository,
	sessions *repositories.SessionRepository, notifier *NotificationService, audit *AuditService,
	actor models.Actor, userID uuid.UUID) error {
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
