package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type EventDisplayIDResolver interface {
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	LabelsByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]event.EventLabel, error)
}

type ProfileService struct {
	db       *postgres.DB
	users    *identity.Users
	tokens   *identity.Tokens
	sessions *identity.Sessions
	notifier Notifier
	prefs    *notification.Preferences
	events   EventDisplayIDResolver
	links    *identity.ProfileLinks
	audit    *audit.AuditService
	hasher   *crypto.PasswordHasher
	mailer   *mail.Mailer
	telegram mail.TelegramSender
	realtime SessionDropper
	avatars  AvatarPurger
	cfg      *config.Config
	now      func() time.Time
}

func NewProfileService(db *postgres.DB, users *identity.Users,
	tokens *identity.Tokens, sessions *identity.Sessions,
	notifier Notifier, prefs *notification.Preferences, events EventDisplayIDResolver,
	links *identity.ProfileLinks,
	audit *audit.AuditService, hasher *crypto.PasswordHasher, mailer *mail.Mailer,
	telegram mail.TelegramSender, cfg *config.Config) *ProfileService {
	return &ProfileService{
		db: db, users: users, tokens: tokens, sessions: sessions, notifier: notifier, prefs: prefs,
		events: events, links: links,
		audit: audit, hasher: hasher, mailer: mailer, telegram: telegram, cfg: cfg,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *ProfileService) Get(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	return s.users.GetByID(ctx, userID)
}

func (s *ProfileService) Update(ctx context.Context, actor models.Actor, req dto.UpdateProfileRequest,
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
		if err := s.checkNickname(ctx, actor, patch); err != nil {
			return err
		}
		if err := s.resolvePinnedEvents(ctx, actor, req, &patch); err != nil {
			return err
		}
		if err := s.holdPreviousNickname(ctx, before, patch); err != nil {
			return err
		}
		updated, err = s.users.UpdateProfile(ctx, actor.UserID, patch)
		if err != nil {
			return err
		}
		if patch.Nickname != nil {
			if err := s.users.DropReservation(ctx, *patch.Nickname); err != nil {
				return err
			}
		}
		was, now := profileSnapshot(before), profileSnapshot(updated)
		if !profileChanged(was, now) {
			return nil
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			was, now)
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func profileChanged(before, after map[string]any) bool {
	was, err := json.Marshal(before)
	if err != nil {
		return true
	}
	now, err := json.Marshal(after)
	if err != nil {
		return true
	}
	return !bytes.Equal(was, now)
}

func profileSnapshot(u *models.User) map[string]any {
	return map[string]any{
		"first_name":            u.FirstName,
		"middle_name":           u.MiddleName,
		"last_name":             u.LastName,
		"nickname":              u.Nickname,
		"profile_visibility":    u.ProfileVisibility,
		"theme":                 u.Theme,
		"pinned_event_ids":      u.PinnedEventIDs,
		"notification_channels": u.NotificationChannels,
		"locale":                u.Locale,
		"timezone":              u.Timezone,
		"avatar_url":            u.AvatarURL,
		"bio_set":               u.Bio != nil,
	}
}

func (s *ProfileService) RequestEmailChange(ctx context.Context, actor models.Actor, req dto.ChangeEmailRequest,
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

	confirmSecret, err := crypto.NewSecret()
	if err != nil {
		return err
	}
	cancelSecret, err := crypto.NewSecret()
	if err != nil {
		return err
	}
	originEmail := user.Email
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
		if err := s.tokens.InvalidateForUser(ctx, user.ID, models.PurposeEmailChangeCancel); err != nil {
			return err
		}
		_, err = s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:      &user.ID,
			Purpose:     models.PurposeEmailChange,
			TokenHash:   crypto.HashSecret(confirmSecret),
			TargetEmail: &newEmail,
			ExpiresAt:   s.now().Add(s.cfg.Auth.EmailVerifyTTL),
		})
		if err != nil {
			return err
		}
		_, err = s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:      &user.ID,
			Purpose:     models.PurposeEmailChangeCancel,
			TokenHash:   crypto.HashSecret(cancelSecret),
			TargetEmail: &newEmail,
			OriginEmail: &originEmail,
			ExpiresAt:   s.now().Add(s.cfg.Auth.EmailChangeCancelTTL),
		})
		return err
	})
	if err != nil {
		return err
	}

	s.mailer.SendEmailChange(ctx, newEmail, user.DisplayName(user.Locale), user.Locale, string(user.Theme),
		confirmSecret, s.cfg.Auth.EmailVerifyTTL)
	s.mailer.SendEmailChangeCancel(ctx, originEmail, user.DisplayName(user.Locale), user.Locale, string(user.Theme),
		cancelSecret, s.cfg.Auth.EmailChangeCancelTTL)
	return nil
}

func (s *ProfileService) Deactivate(ctx context.Context, actor models.Actor) error {
	if err := deactivateUser(ctx, s.db, s.users, s.sessions, s.notifier,
		s.audit, actor, actor.UserID); err != nil {
		return err
	}
	s.dropUser(actor.UserID)
	return nil
}

func deactivateUser(ctx context.Context, db *postgres.DB, users *identity.Users,
	sessions *identity.Sessions, notifier Notifier,
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
