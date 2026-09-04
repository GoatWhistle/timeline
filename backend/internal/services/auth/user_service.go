package auth

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
)

type UserService struct {
	db       *postgres.DB
	users    *identity.Users
	sessions *identity.Sessions
	notifier Notifier
	audit    *audit.AuditService
	realtime SessionDropper
	avatars  AvatarPurger
	cfg      *config.Config
	now      func() time.Time
}

func NewUserService(db *postgres.DB, users *identity.Users,
	sessions *identity.Sessions, notifier Notifier, audit *audit.AuditService,
	cfg *config.Config) *UserService {
	return &UserService{db: db, users: users, sessions: sessions, notifier: notifier,
		audit: audit, cfg: cfg, now: func() time.Time { return time.Now().UTC() }}
}

func (s *UserService) ResolveUserDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.users.ResolveDisplayID(ctx, displayID)
}

func (s *UserService) Search(ctx context.Context, actor models.Actor, query string, page models.Page,
) ([]dto.UserSummary, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("user search is restricted to administrators")
	}
	return s.users.Search(ctx, query, page)
}

func (s *UserService) SetActive(ctx context.Context, actor models.Actor, userID uuid.UUID, active bool) error {
	if !actor.IsAdmin {
		return models.NewForbidden("the operation is restricted to administrators")
	}
	if !active {
		if err := deactivateUser(ctx, s.db, s.users, s.sessions, s.notifier,
			s.audit, actor, userID); err != nil {
			return err
		}
		s.dropUser(userID)
		return nil
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		user, err := s.users.GetByID(ctx, userID)
		if err != nil {
			return err
		}
		if user.DeletedAt != nil {
			return models.NewConflict("user_deleted", "a deleted account cannot be restored")
		}
		if user.IsActive {
			return models.NewConflict("already_active", "the account is already active")
		}
		if err := s.users.SetActive(ctx, userID, true); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserActivate, models.EntityUser, userID,
			map[string]any{"is_active": false}, map[string]any{"is_active": true})
	})
}

func (s *UserService) Delete(ctx context.Context, actor models.Actor, userID uuid.UUID) error {
	if !actor.IsAdmin {
		return models.NewForbidden("deletion is restricted to administrators")
	}
	if actor.UserID == userID {
		return models.NewConflict("self_delete", "you cannot delete your own account")
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		user, err := s.users.GetByID(ctx, userID)
		if err != nil {
			return err
		}
		if user.DeletedAt != nil {
			return models.NewConflict("already_deleted", "the account is already deleted")
		}
		if err := s.sessions.RevokeAllForUser(ctx, userID); err != nil {
			return err
		}
		if err := s.notifier.CancelForRecipient(ctx, userID); err != nil {
			return err
		}
		if err := s.holdNickname(ctx, user); err != nil {
			return err
		}
		if err := s.users.Anonymize(ctx, userID); err != nil {
			return err
		}
		if s.avatars != nil {
			s.avatars.DeleteForUser(ctx, userID, user.AvatarURL)
		}
		if err := s.audit.Record(ctx, actor, models.AuditUserDelete, models.EntityUser, userID,
			map[string]any{"email": user.Email, "display_name": user.DisplayName(user.Locale)},
			map[string]any{"deleted": true}); err != nil {
			return err
		}
		s.dropUser(userID)
		return nil
	})
}

func (s *UserService) holdNickname(ctx context.Context, user *models.User) error {
	if user.Nickname == nil {
		return nil
	}
	return s.users.ReserveNickname(ctx, *user.Nickname, user.ID,
		s.now().Add(s.cfg.Auth.NicknameHoldTTL))
}
