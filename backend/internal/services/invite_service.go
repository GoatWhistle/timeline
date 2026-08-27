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

func NewInviteService(db *repositories.DB, invites *repositories.InviteRepository,
	users *repositories.UserRepository, auth *AuthService, audit *AuditService, mailer *Mailer,
	limiter RateLimiter, cfg *config.Config) *InviteService {
	return &InviteService{
		db: db, invites: invites, users: users, auth: auth, audit: audit, mailer: mailer,
		limiter: limiter, cfg: cfg, now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *InviteService) Create(ctx context.Context, actor models.Actor, email string) (*models.Invite, string, error) {
	if !actor.IsAdmin {
		return nil, "", models.NewForbidden("only an administrator can create invites")
	}
	normalized, err := validateEmail("email", email)
	if err != nil {
		return nil, "", err
	}
	if !s.limiter.Allow("invite|"+normalized, s.cfg.RateLim.ResendAttempts, s.cfg.RateLim.ResendWindow) {
		return nil, "", models.NewRateLimited("too many invites for this address, try again later")
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

		if _, err := s.users.GetByEmail(ctx, normalized); err == nil {
			return models.NewConflict("user_exists", "a user with this email already exists")
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

func (s *InviteService) List(ctx context.Context, actor models.Actor, page models.Page) ([]models.Invite, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the invite list is restricted to administrators")
	}
	return s.invites.List(ctx, page)
}

func (s *InviteService) Revoke(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	if !actor.IsAdmin {
		return models.NewForbidden("revoking an invite is restricted to administrators")
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

func (s *InviteService) Preview(ctx context.Context, token string) (*models.InvitePreview, error) {
	invite, err := s.invites.GetByHash(ctx, HashSecret(token))
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewNotFound("invite not found")
		}
		return nil, err
	}
	return &models.InvitePreview{
		Email:     invite.NormalizedEmail,
		ExpiresAt: invite.ExpiresAt,
		Valid:     invite.Usable(s.now()),
	}, nil
}

func (s *InviteService) Accept(ctx context.Context, req models.AcceptInviteRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	invite, err := s.invites.GetByHash(ctx, HashSecret(req.Token))
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, nil, models.NewNotFound("invite not found")
		}
		return nil, nil, err
	}
	if !invite.Usable(s.now()) {
		return nil, nil, models.NewConflict("invite_not_usable", "the invite has already been used, revoked or expired")
	}
	return s.auth.Register(ctx, models.RegisterRequest{
		DisplayName: req.DisplayName,
		Email:       invite.NormalizedEmail,
		Password:    req.Password,
		InviteToken: req.Token,
	}, meta)
}
