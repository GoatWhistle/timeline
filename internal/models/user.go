package models

import (
	"time"

	"github.com/google/uuid"
)

// User — учётная запись системы (раздел 4 ТЗ).
type User struct {
	ID               uuid.UUID  `json:"id"`
	DisplayName      string     `json:"display_name"`
	Email            string     `json:"email"`
	PendingEmail     *string    `json:"pending_email,omitempty"`
	PasswordHash     string     `json:"-"`
	EmailVerifiedAt  *time.Time `json:"email_verified_at,omitempty"`
	TelegramUsername *string    `json:"telegram_username,omitempty"`
	TelegramChatID   *string    `json:"-"`
	PreferredChannel *Channel   `json:"preferred_channel,omitempty"`
	IsAdmin          bool       `json:"is_admin"`
	IsActive         bool       `json:"is_active"`
	DeletedAt        *time.Time `json:"-"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// TelegramLinked сообщает, что у пользователя есть подтверждённая привязка Telegram.
func (u *User) TelegramLinked() bool {
	return u.TelegramChatID != nil && *u.TelegramChatID != ""
}

// EmailVerified сообщает, что основной адрес подтверждён.
func (u *User) EmailVerified() bool {
	return u.EmailVerifiedAt != nil
}

// CanReceive сообщает, доступен ли пользователю канал для продуктовых уведомлений.
// Email становится доступен только после подтверждения адреса (раздел 10.4 ТЗ).
func (u *User) CanReceive(ch Channel) bool {
	if !u.IsActive {
		return false
	}
	switch ch {
	case ChannelTelegram:
		return u.TelegramLinked()
	case ChannelEmail:
		return u.EmailVerified()
	}
	return false
}

// Session — сессия пользователя, хранит только хеш refresh-токена (раздел 3 ТЗ).
type Session struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	FamilyID         uuid.UUID  `json:"-"`
	RefreshTokenHash string     `json:"-"`
	UserAgent        *string    `json:"user_agent,omitempty"`
	IP               *string    `json:"ip,omitempty"`
	ExpiresAt        time.Time  `json:"expires_at"`
	LastUsedAt       *time.Time `json:"last_used_at,omitempty"`
	RevokedAt        *time.Time `json:"revoked_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

// Active сообщает, что сессия не отозвана и не истекла.
func (s *Session) Active(now time.Time) bool {
	return s.RevokedAt == nil && s.ExpiresAt.After(now)
}

// OneTimeToken — одноразовый токен подтверждения email, сброса пароля,
// смены адреса или привязки Telegram.
type OneTimeToken struct {
	ID          uuid.UUID    `json:"id"`
	UserID      *uuid.UUID   `json:"user_id,omitempty"`
	Purpose     TokenPurpose `json:"purpose"`
	TokenHash   string       `json:"-"`
	TargetEmail *string      `json:"target_email,omitempty"`
	ExpiresAt   time.Time    `json:"expires_at"`
	ConsumedAt  *time.Time   `json:"consumed_at,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
}

// Usable сообщает, что токен не использован и не истёк.
func (t *OneTimeToken) Usable(now time.Time) bool {
	return t.ConsumedAt == nil && t.ExpiresAt.After(now)
}

// Invite — приглашение на регистрацию по нормализованному email.
type Invite struct {
	ID              uuid.UUID  `json:"id"`
	NormalizedEmail string     `json:"email"`
	CreatedByUserID uuid.UUID  `json:"created_by_user_id"`
	TokenHash       string     `json:"-"`
	ExpiresAt       time.Time  `json:"expires_at"`
	AcceptedAt      *time.Time `json:"accepted_at,omitempty"`
	RevokedAt       *time.Time `json:"revoked_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// Usable сообщает, что приглашение можно принять.
func (i *Invite) Usable(now time.Time) bool {
	return i.AcceptedAt == nil && i.RevokedAt == nil && i.ExpiresAt.After(now)
}
