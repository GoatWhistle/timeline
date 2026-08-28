package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
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
	notifier *NotificationService
	audit    *AuditService
	hasher   *PasswordHasher
	issuer   *TokenIssuer
	mailer   *Mailer
	limiter  RateLimiter
	cfg      *config.Config
	now      func() time.Time
}

func NewAuthService(db *postgres.DB, users *identity.Users,
	sessions *identity.Sessions, tokens *identity.Tokens,
	invites *identity.Invites, notifier *NotificationService, audit *AuditService,
	hasher *PasswordHasher, issuer *TokenIssuer, mailer *Mailer, limiter RateLimiter,
	cfg *config.Config) *AuthService {
	return &AuthService{
		db: db, users: users, sessions: sessions, tokens: tokens, invites: invites,
		notifier: notifier, audit: audit, hasher: hasher, issuer: issuer, mailer: mailer,
		limiter: limiter, cfg: cfg, now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *AuthService) Register(ctx context.Context, req models.RegisterRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	email, err := validateEmail("email", req.Email)
	if err != nil {
		return nil, nil, err
	}
	displayName, err := validateText("display_name", req.DisplayName, 1, 120)
	if err != nil {
		return nil, nil, err
	}
	if err := validatePassword(req.Password, s.cfg.Auth.MinPasswordLength); err != nil {
		return nil, nil, err
	}
	hash, err := s.hasher.Hash(req.Password)
	if err != nil {
		return nil, nil, err
	}

	var (
		user         *models.User
		verifySecret string
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		var invite *models.Invite
		if req.InviteToken != "" {
			invite, err = s.invites.GetByHash(ctx, HashSecret(req.InviteToken))
			if err != nil {
				return models.NewValidation("invite not found or invalid")
			}
			if !invite.Usable(s.now()) {
				return models.NewConflict("invite_not_usable", "the invite has already been used, revoked or expired")
			}
			if invite.NormalizedEmail != email {
				return models.NewValidation("email does not match the invited address")
			}
		}

		taken, err := s.users.EmailTaken(ctx, email, uuid.Nil)
		if err != nil {
			return err
		}
		if taken {
			return models.NewConflict("email_taken", "a user with this email already exists")
		}

		user, err = s.users.Create(ctx, &models.User{
			DisplayName:  displayName,
			Email:        email,
			PasswordHash: hash,
			IsActive:     true,
		})
		if err != nil {
			return err
		}

		if invite != nil {
			if err := s.invites.MarkAccepted(ctx, invite.ID); err != nil {
				return err
			}
			if err := s.invites.RevokePendingByEmail(ctx, email); err != nil {
				return err
			}
		}

		verifySecret, err = NewSecret()
		if err != nil {
			return err
		}
		if _, err := s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:    &user.ID,
			Purpose:   models.TokenEmailVerification,
			TokenHash: HashSecret(verifySecret),
			ExpiresAt: s.now().Add(s.cfg.Auth.EmailVerifyTTL),
		}); err != nil {
			return err
		}

		actor := models.Actor{UserID: user.ID, RequestID: ""}
		return s.audit.Record(ctx, actor, models.AuditUserRegister, models.EntityUser, user.ID, nil,
			map[string]any{"email": user.Email, "display_name": user.DisplayName})
	})
	if err != nil {
		return nil, nil, err
	}

	s.mailer.SendVerification(ctx, user.Email, user.DisplayName, user.Locale, verifySecret, s.cfg.Auth.EmailVerifyTTL)

	pair, err := s.startSession(ctx, user, meta)
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

func (s *AuthService) Login(ctx context.Context, req models.LoginRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	email := normalizeEmail(req.Email)
	key := meta.IP + "|" + email
	if !s.limiter.Allow("login|"+key, s.cfg.RateLim.LoginAttempts, s.cfg.RateLim.LoginWindow) {
		return nil, nil, models.NewRateLimited("too many sign-in attempts, try again later")
	}

	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, nil, models.NewUnauthorized("invalid email or password")
		}
		return nil, nil, err
	}
	if !s.hasher.Verify(req.Password, user.PasswordHash) {
		return nil, nil, models.NewUnauthorized("invalid email or password")
	}
	if !user.IsActive {
		return nil, nil, models.NewForbidden("the account is deactivated")
	}

	s.limiter.Reset("login|" + key)
	pair, err := s.startSession(ctx, user, meta)
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string, meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	hash := HashSecret(refreshToken)
	now := s.now()

	var (
		user *models.User
		pair *models.TokenPair
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		session, err := s.sessions.GetByHash(ctx, hash)
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewUnauthorized("session not found")
			}
			return err
		}
		if session.RevokedAt != nil {
			if err := s.sessions.RevokeFamily(ctx, session.FamilyID); err != nil {
				return err
			}
			return models.NewUnauthorized("session revoked: refresh chain terminated")
		}
		if !session.Active(now) {
			return models.NewUnauthorized("session has expired")
		}

		user, err = s.users.GetByID(ctx, session.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			if err := s.sessions.RevokeAllForUser(ctx, user.ID); err != nil {
				return err
			}
			return models.NewForbidden("the account is deactivated")
		}

		secret, err := NewSecret()
		if err != nil {
			return err
		}
		next, err := s.sessions.Rotate(ctx, session, &models.Session{
			UserID:           user.ID,
			RefreshTokenHash: HashSecret(secret),
			UserAgent:        optionalString(meta.UserAgent),
			IP:               optionalString(meta.IP),
			ExpiresAt:        now.Add(s.cfg.Auth.RefreshTTL),
		})
		if err != nil {
			return err
		}

		access, expires, err := s.issuer.Issue(user.ID, next.ID, now)
		if err != nil {
			return err
		}
		pair = &models.TokenPair{
			AccessToken:      access,
			AccessExpiresAt:  expires,
			RefreshToken:     secret,
			RefreshExpiresAt: next.ExpiresAt,
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	session, err := s.sessions.GetByHash(ctx, HashSecret(refreshToken))
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil
		}
		return err
	}
	return s.sessions.Revoke(ctx, session.ID)
}

func (s *AuthService) LogoutAll(ctx context.Context, actor models.Actor) error {
	if actor.IsSystem() {
		return models.NewUnauthorized("authentication is required")
	}
	return s.sessions.RevokeAllForUser(ctx, actor.UserID)
}

func (s *AuthService) Authenticate(ctx context.Context, accessToken string) (*models.User, error) {
	userID, _, err := s.issuer.Parse(accessToken)
	if err != nil {
		return nil, err
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewUnauthorized("user not found")
		}
		return nil, err
	}
	if !user.IsActive {
		return nil, models.NewForbidden("the account is deactivated")
	}
	return user, nil
}

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

func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	normalized := normalizeEmail(email)
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

	secret, err := NewSecret()
	if err != nil {
		return err
	}
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.tokens.InvalidateForUser(ctx, user.ID, models.TokenPasswordReset); err != nil {
			return err
		}
		_, err := s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:    &user.ID,
			Purpose:   models.TokenPasswordReset,
			TokenHash: HashSecret(secret),
			ExpiresAt: s.now().Add(s.cfg.Auth.PasswordResetTTL),
		})
		return err
	})
	if err != nil {
		return err
	}
	s.mailer.SendPasswordReset(ctx, user.Email, user.DisplayName, user.Locale, secret, s.cfg.Auth.PasswordResetTTL)
	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, token, password string) error {
	if err := validatePassword(password, s.cfg.Auth.MinPasswordLength); err != nil {
		return err
	}
	hash, err := s.hasher.Hash(password)
	if err != nil {
		return err
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, HashSecret(token), models.TokenPasswordReset, s.now())
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

func (s *AuthService) startSession(ctx context.Context, user *models.User, meta models.SessionMeta) (*models.TokenPair, error) {
	now := s.now()
	secret, err := NewSecret()
	if err != nil {
		return nil, err
	}
	session, err := s.sessions.Create(ctx, &models.Session{
		UserID:           user.ID,
		FamilyID:         uuid.New(),
		RefreshTokenHash: HashSecret(secret),
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
