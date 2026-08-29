package auth

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
)

type RateLimiter interface {
	Allow(key string, limit int, window time.Duration) bool
	Reset(key string)
}

type AuthService struct {
	db       *postgres.DB
	users    *identity.Users
	sessions *identity.Sessions
	tokens   *identity.Tokens
	invites  *identity.Invites
	notifier Notifier
	audit    *audit.AuditService
	hasher   *crypto.PasswordHasher
	issuer   *crypto.TokenIssuer
	mailer   *mail.Mailer
	limiter  RateLimiter
	realtime SessionDropper
	cfg      *config.Config
	now      func() time.Time
}

func NewAuthService(db *postgres.DB, users *identity.Users,
	sessions *identity.Sessions, tokens *identity.Tokens,
	invites *identity.Invites, notifier Notifier, audit *audit.AuditService,
	hasher *crypto.PasswordHasher, issuer *crypto.TokenIssuer, mailer *mail.Mailer, limiter RateLimiter,
	cfg *config.Config) *AuthService {
	return &AuthService{
		db: db, users: users, sessions: sessions, tokens: tokens, invites: invites,
		notifier: notifier, audit: audit, hasher: hasher, issuer: issuer, mailer: mailer,
		limiter: limiter, cfg: cfg, now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *AuthService) startSession(ctx context.Context, user *models.User,
	meta models.SessionMeta) (*models.TokenPair, error) {
	now := s.now()
	secret, err := crypto.NewSecret()
	if err != nil {
		return nil, err
	}
	session, err := s.sessions.Create(ctx, &models.Session{
		UserID:           user.ID,
		FamilyID:         uuid.New(),
		RefreshTokenHash: crypto.HashSecret(secret),
		UserAgent:        optionalString(meta.UserAgent),
		IP:               optionalString(meta.IP),
		ExpiresAt:        now.Add(s.cfg.Auth.RefreshTTL),
	})
	if err != nil {
		return nil, err
	}
	access, expires, err := s.issuer.Issue(user.ID, session.ID, now)
	if err != nil {
		return nil, err
	}
	return &models.TokenPair{
		AccessToken:      access,
		AccessExpiresAt:  expires,
		RefreshToken:     secret,
		RefreshExpiresAt: session.ExpiresAt,
	}, nil
}

func optionalString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	if len(trimmed) > 512 {
		trimmed = trimmed[:512]
	}
	return &trimmed
}
