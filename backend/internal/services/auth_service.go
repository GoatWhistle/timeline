package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// RateLimiter ограничивает частоту чувствительных операций.
type RateLimiter interface {
	Allow(key string, limit int, window time.Duration) bool
	Reset(key string)
}

// AuthService реализует регистрацию, вход, ротацию сессий и восстановление доступа.
type AuthService struct {
	db       *repositories.DB
	users    *repositories.UserRepository
	sessions *repositories.SessionRepository
	tokens   *repositories.TokenRepository
	invites  *repositories.InviteRepository
	notifier *NotificationService
	audit    *AuditService
	hasher   *PasswordHasher
	issuer   *TokenIssuer
	mailer   *Mailer
	limiter  RateLimiter
	cfg      *config.Config
	now      func() time.Time
}

// NewAuthService создаёт сервис аутентификации.
func NewAuthService(db *repositories.DB, users *repositories.UserRepository,
	sessions *repositories.SessionRepository, tokens *repositories.TokenRepository,
	invites *repositories.InviteRepository, notifier *NotificationService, audit *AuditService,
	hasher *PasswordHasher, issuer *TokenIssuer, mailer *Mailer, limiter RateLimiter,
	cfg *config.Config) *AuthService {
	return &AuthService{
		db: db, users: users, sessions: sessions, tokens: tokens, invites: invites,
		notifier: notifier, audit: audit, hasher: hasher, issuer: issuer, mailer: mailer,
		limiter: limiter, cfg: cfg, now: func() time.Time { return time.Now().UTC() },
	}
}

// Register создаёт учётную запись и открывает сессию.
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
		// Приглашение фиксирует адрес: регистрация по нему не должна
		// подменять получателя.
		var invite *models.Invite
		if req.InviteToken != "" {
			invite, err = s.invites.GetByHash(ctx, HashSecret(req.InviteToken))
			if err != nil {
				return models.NewValidation("приглашение не найдено или недействительно")
			}
			if !invite.Usable(s.now()) {
				return models.NewConflict("invite_not_usable", "приглашение уже использовано, отозвано или истекло")
			}
			if invite.NormalizedEmail != email {
				return models.NewValidation("адрес не совпадает с адресом приглашения")
			}
		}

		taken, err := s.users.EmailTaken(ctx, email, uuid.Nil)
		if err != nil {
			return err
		}
		if taken {
			return models.NewConflict("email_taken", "пользователь с таким email уже существует")
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
			// Остальные действующие приглашения этого адреса отзываются
			// в той же транзакции.
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

	s.mailer.SendVerification(ctx, user.Email, user.DisplayName, verifySecret, s.cfg.Auth.EmailVerifyTTL)

	pair, err := s.startSession(ctx, user, meta)
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

// Login проверяет учётные данные и открывает сессию.
func (s *AuthService) Login(ctx context.Context, req models.LoginRequest, meta models.SessionMeta) (*models.User, *models.TokenPair, error) {
	email := normalizeEmail(req.Email)
	key := meta.IP + "|" + email
	if !s.limiter.Allow("login|"+key, s.cfg.RateLim.LoginAttempts, s.cfg.RateLim.LoginWindow) {
		return nil, nil, models.NewRateLimited("слишком много попыток входа, повторите позже")
	}

	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			// Ответ не различает отсутствие записи и неверный пароль.
			return nil, nil, models.NewUnauthorized("неверный email или пароль")
		}
		return nil, nil, err
	}
	if !s.hasher.Verify(req.Password, user.PasswordHash) {
		return nil, nil, models.NewUnauthorized("неверный email или пароль")
	}
	if !user.IsActive {
		return nil, nil, models.NewForbidden("учётная запись деактивирована")
	}

	s.limiter.Reset("login|" + key)
	pair, err := s.startSession(ctx, user, meta)
	if err != nil {
		return nil, nil, err
	}
	return user, pair, nil
}

// Refresh выполняет ротацию сессии. Повторное предъявление отозванного токена
// отзывает всю цепочку: это признак утечки refresh-токена.
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
				return models.NewUnauthorized("сессия не найдена")
			}
			return err
		}
		if session.RevokedAt != nil {
			if err := s.sessions.RevokeFamily(ctx, session.FamilyID); err != nil {
				return err
			}
			return models.NewUnauthorized("сессия отозвана: цепочка обновления завершена")
		}
		if !session.Active(now) {
			return models.NewUnauthorized("сессия истекла")
		}

		user, err = s.users.GetByID(ctx, session.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			if err := s.sessions.RevokeAllForUser(ctx, user.ID); err != nil {
				return err
			}
			return models.NewForbidden("учётная запись деактивирована")
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

// Logout отзывает текущую сессию.
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

// LogoutAll отзывает все сессии пользователя.
func (s *AuthService) LogoutAll(ctx context.Context, actor models.Actor) error {
	if actor.IsSystem() {
		return models.NewUnauthorized("требуется аутентификация")
	}
	return s.sessions.RevokeAllForUser(ctx, actor.UserID)
}

// Authenticate проверяет access token и возвращает активного пользователя.
func (s *AuthService) Authenticate(ctx context.Context, accessToken string) (*models.User, error) {
	userID, _, err := s.issuer.Parse(accessToken)
	if err != nil {
		return nil, err
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewUnauthorized("пользователь не найден")
		}
		return nil, err
	}
	if !user.IsActive {
		return nil, models.NewForbidden("учётная запись деактивирована")
	}
	return user, nil
}

// VerifyEmail подтверждает основной адрес по одноразовому токену.
func (s *AuthService) VerifyEmail(ctx context.Context, token string) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, HashSecret(token), models.TokenEmailVerification, s.now())
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewValidation("токен подтверждения недействителен или истёк")
			}
			return err
		}
		if record.UserID == nil {
			return models.NewValidation("токен подтверждения недействителен")
		}
		return s.users.SetEmailVerified(ctx, *record.UserID)
	})
}

// ResendVerification повторно отправляет письмо подтверждения.
// Ответ не раскрывает существование учётной записи.
func (s *AuthService) ResendVerification(ctx context.Context, email string) error {
	normalized := normalizeEmail(email)
	if !s.limiter.Allow("resend|"+normalized, s.cfg.RateLim.ResendAttempts, s.cfg.RateLim.ResendWindow) {
		return models.NewRateLimited("слишком много запросов, повторите позже")
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
	s.mailer.SendVerification(ctx, user.Email, user.DisplayName, secret, s.cfg.Auth.EmailVerifyTTL)
	return nil
}

// ForgotPassword выдаёт одноразовый токен восстановления доступа.
func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	normalized := normalizeEmail(email)
	if !s.limiter.Allow("reset|"+normalized, s.cfg.RateLim.ResendAttempts, s.cfg.RateLim.ResendWindow) {
		return models.NewRateLimited("слишком много запросов, повторите позже")
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
	s.mailer.SendPasswordReset(ctx, user.Email, user.DisplayName, secret, s.cfg.Auth.PasswordResetTTL)
	return nil
}

// ResetPassword устанавливает новый пароль и отзывает все сессии пользователя.
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
				return models.NewValidation("токен восстановления недействителен или истёк")
			}
			return err
		}
		if record.UserID == nil {
			return models.NewValidation("токен восстановления недействителен")
		}
		if err := s.users.SetPassword(ctx, *record.UserID, hash); err != nil {
			return err
		}
		return s.sessions.RevokeAllForUser(ctx, *record.UserID)
	})
}

// ConfirmEmailChange переносит ожидающий адрес в основной.
func (s *AuthService) ConfirmEmailChange(ctx context.Context, token string) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, HashSecret(token), models.TokenEmailChange, s.now())
		if err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return models.NewValidation("токен подтверждения недействителен или истёк")
			}
			return err
		}
		if record.UserID == nil || record.TargetEmail == nil {
			return models.NewValidation("токен подтверждения недействителен")
		}

		user, err := s.users.GetByID(ctx, *record.UserID)
		if err != nil {
			return err
		}
		// Адрес мог быть занят между запросом и подтверждением.
		taken, err := s.users.EmailTaken(ctx, *record.TargetEmail, user.ID)
		if err != nil {
			return err
		}
		if taken {
			return models.NewConflict("email_taken", "этот адрес уже занят другой учётной записью")
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

// startSession создаёт новую сессию и пару токенов.
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
