package models

import (
	"time"

	"github.com/google/uuid"
)

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
	Locale           string     `json:"locale"`
	Timezone         string     `json:"timezone"`
	IsAdmin          bool       `json:"is_admin"`
	IsActive         bool       `json:"is_active"`
	DeletedAt        *time.Time `json:"-"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (u *User) TelegramLinked() bool {
	return u.TelegramChatID != nil && *u.TelegramChatID != ""
}

func (u *User) EmailVerified() bool {
	return u.EmailVerifiedAt != nil
}

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

func (s *Session) Active(now time.Time) bool {
	return s.RevokedAt == nil && s.ExpiresAt.After(now)
}

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

func (t *OneTimeToken) Usable(now time.Time) bool {
	return t.ConsumedAt == nil && t.ExpiresAt.After(now)
}

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

func (i *Invite) Usable(now time.Time) bool {
	return i.AcceptedAt == nil && i.RevokedAt == nil && i.ExpiresAt.After(now)
}
