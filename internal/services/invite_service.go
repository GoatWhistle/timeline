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

// InviteService управляет приглашениями на регистрацию.
type InviteService struct {
	db      *repositories.DB
	invites *repositories.InviteRepository
	users   *repositories.UserRepository
	auth    *AuthService
	audit   *AuditService
	mailer  *Mailer
	limiter RateLimiter
	cfg     *config.Config
	now     func() time.Time
}

// NewInviteService создаёт сервис приглашений.
func NewInviteService(db *repositories.DB, invites *repositories.InviteRepository,
	users *repositories.UserRepository, auth *AuthService, audit *AuditService, mailer *Mailer,
	limiter RateLimiter, cfg *config.Config) *InviteService {
	return &InviteService{
		db: db, invites: invites, users: users, auth: auth, audit: audit, mailer: mailer,
		limiter: limiter, cfg: cfg, now: func() time.Time { return time.Now().UTC() },
	}
}

// Create выпускает приглашение. Операция сериализуется по адресу: предыдущее
// действующее приглашение отзывается, затем создаётся новое (раздел 3 ТЗ).
func (s *InviteService) Create(ctx context.Context, actor models.Actor, email string) (*models.Invite, string, error) {
	if !actor.IsAdmin {
		return nil, "", models.NewForbidden("приглашения создаёт только администратор")
	}
	normalized, err := validateEmail("email", email)
	if err != nil {
		return nil, "", err
	}
	if !s.limiter.Allow("invite|"+normalized, s.cfg.RateLim.ResendAttempts, s.cfg.RateLim.ResendWindow) {
		return nil, "", models.NewRateLimited("слишком много приглашений на этот адрес, повторите позже")
	}

	secret, err := NewSecret()
	if err != nil {
		return nil, "", err
	}

	var (
		invite  *models.Invite
		creator *models.User
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.invites.LockByEmail(ctx, normalized); err != nil {
			return err
		}

		// Приглашение на адрес существующего пользователя отклоняется независимо
		// от его активности: активного администратор добавляет напрямую,
		// деактивированного сначала активирует.
		if _, err := s.users.GetByEmail(ctx, normalized); err == nil {
			return models.NewConflict("user_exists", "пользователь с таким email уже существует")
		} else if !errors.Is(err, models.ErrNotFound) {
			return err
		}

		if err := s.invites.RevokePendingByEmail(ctx, normalized); err != nil {
			return err
		}
		invite, err = s.invites.Create(ctx, &models.Invite{
			NormalizedEmail: normalized,
			CreatedByUserID: actor.UserID,
			TokenHash:       HashSecret(secret),
			ExpiresAt:       s.now().Add(s.cfg.Auth.InviteTTL),
		})
		if err != nil {
			return err
		}
		creator, err = s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditInviteCreate, models.EntityInvite, invite.ID, nil,
			map[string]any{"email": normalized, "expires_at": invite.ExpiresAt})
	})
	if err != nil {
		return nil, "", err
	}

	s.mailer.SendInvite(ctx, normalized, creator.DisplayName, secret, s.cfg.Auth.InviteTTL)
	return invite, secret, nil
}

// List возвращает страницу приглашений.
func (s *InviteService) List(ctx context.Context, actor models.Actor, page models.Page) ([]models.Invite, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("список приглашений доступен только администратору")
	}
	return s.invites.List(ctx, page)
}

// Revoke отзывает приглашение.
func (s *InviteService) Revoke(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	if !actor.IsAdmin {
		return models.NewForbidden("отзыв приглашения доступен только администратору")
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		invite, err := s.invites.GetByID(ctx, id)
		if err != nil {
			return err
		}
		if err := s.invites.Revoke(ctx, id); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditInviteRevoke, models.EntityInvite, id,
			map[string]any{"email": invite.NormalizedEmail}, nil)
	})
}

// Preview показывает адрес и срок действия приглашения по токену.
func (s *InviteService) Preview(ctx context.Context, token string) (*models.InvitePreview, error) {
	invite, err := s.invites.GetByHash(ctx, HashSecret(token))
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewNotFound("приглашение не найдено")
		}
		return nil, err
	}
	return &models.InvitePreview{
		Email:     invite.NormalizedEmail,
		ExpiresAt: invite.ExpiresAt,
		Valid:     invite.Usable(s.now()),
	}, nil
}

// Accept создаёт учётную запись по приглашению и открывает сессию.
func (s *InviteService) Accept(ctx context.Context, req models.AcceptInviteRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	invite, err := s.invites.GetByHash(ctx, HashSecret(req.Token))
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, nil, models.NewNotFound("приглашение не найдено")
		}
		return nil, nil, err
	}
	if !invite.Usable(s.now()) {
		return nil, nil, models.NewConflict("invite_not_usable", "приглашение уже использовано, отозвано или истекло")
	}
	// Адрес берётся из приглашения: подменить получателя нельзя.
	return s.auth.Register(ctx, models.RegisterRequest{
		DisplayName: req.DisplayName,
		Email:       invite.NormalizedEmail,
		Password:    req.Password,
		InviteToken: req.Token,
	}, meta)
}
