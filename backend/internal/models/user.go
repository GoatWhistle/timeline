package models

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                   uuid.UUID         `json:"id"`
	DisplayID            string            `json:"display_id"`
	FirstName            string            `json:"first_name"`
	MiddleName           *string           `json:"middle_name,omitempty"`
	LastName             string            `json:"last_name"`
	LegacyDisplayName    *string           `json:"legacy_display_name,omitempty"`
	Nickname             *string           `json:"nickname,omitempty"`
	ProfilePublic        bool              `json:"profile_public"`
	ProfileVisibility    ProfileVisibility `json:"profile_visibility"`
	PinnedEventIDs       []uuid.UUID       `json:"-"`
	Theme                UserTheme         `json:"theme"`
	Email                string            `json:"email"`
	PendingEmail         *string           `json:"pending_email,omitempty"`
	PasswordHash         string            `json:"-"`
	EmailVerifiedAt      *time.Time        `json:"email_verified_at,omitempty"`
	TelegramUsername     *string           `json:"telegram_username,omitempty"`
	TelegramChatID       *string           `json:"-"`
	NotificationChannels ChannelSet        `json:"notification_channels"`
	AvatarURL            *string           `json:"avatar_url,omitempty"`
	Bio                  *string           `json:"bio,omitempty"`
	Locale               string            `json:"locale"`
	Timezone             string            `json:"timezone"`
	Shortcuts            Shortcuts         `json:"shortcuts"`
	IsAdmin              bool              `json:"is_admin"`
	IsActive             bool              `json:"is_active"`
	DeletedAt            *time.Time        `json:"-"`
	CreatedAt            time.Time         `json:"created_at"`
	UpdatedAt            time.Time         `json:"updated_at"`
}

func (u *User) DisplayName(locale string) string {
	return FormatFullName(locale, u.FirstName, u.MiddleName, u.LastName)
}

func (u *User) TelegramLinked() bool {
	return u.TelegramChatID != nil && *u.TelegramChatID != ""
}

func (u *User) EmailVerified() bool {
	return u.EmailVerifiedAt != nil
}

type Session struct {
	ID               uuid.UUID  `json:"id"`
	DisplayID        string     `json:"display_id"`
	UserID           uuid.UUID  `json:"user_id"`
	FamilyID         uuid.UUID  `json:"-"`
	RefreshTokenHash string     `json:"-"`
	DeviceHash       *string    `json:"-"`
	UserAgent        *string    `json:"user_agent,omitempty"`
	IP               *string    `json:"ip,omitempty"`
	Label            *string    `json:"label,omitempty"`
	ExpiresAt        time.Time  `json:"expires_at"`
	LastUsedAt       *time.Time `json:"last_used_at,omitempty"`
	RevokedAt        *time.Time `json:"revoked_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

const SessionLabelMaxLength = 64

const DeviceIDLength = 32

func ValidDeviceID(value string) bool {
	if len(value) != DeviceIDLength {
		return false
	}
	for _, r := range value {
		if (r < '0' || r > '9') && (r < 'a' || r > 'f') {
			return false
		}
	}
	return true
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
	OriginEmail *string      `json:"origin_email,omitempty"`
	ExpiresAt   time.Time    `json:"expires_at"`
	ConsumedAt  *time.Time   `json:"consumed_at,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
}

func (t *OneTimeToken) Usable(now time.Time) bool {
	return t.ConsumedAt == nil && t.ExpiresAt.After(now)
}

const (
	LocaleRU = "ru"

	NameMinLen = 1
	NameMaxLen = 80

	NicknameMinLen = 3
	NicknameMaxLen = 39
)

func FormatFullName(locale, first string, middle *string, last string) string {
	first = strings.TrimSpace(first)
	last = strings.TrimSpace(last)
	if locale == LocaleRU {
		return joinName(last, first, middleValue(middle))
	}
	return joinName(first, middleValue(middle), last)
}

func FormatListName(locale, first string, middle *string, last string) string {
	first = strings.TrimSpace(first)
	last = strings.TrimSpace(last)
	if locale == LocaleRU {
		return joinName(last, first)
	}
	return joinName(first, last)
}

func FormatAddressName(locale, first string, middle *string) string {
	first = strings.TrimSpace(first)
	if locale == LocaleRU {
		return joinName(first, middleValue(middle))
	}
	return first
}

func NameInitials(first, last string) string {
	return firstRune(first) + firstRune(last)
}

func middleValue(middle *string) string {
	if middle == nil {
		return ""
	}
	return strings.TrimSpace(*middle)
}

func joinName(parts ...string) string {
	present := parts[:0]
	for _, part := range parts {
		if part != "" {
			present = append(present, part)
		}
	}
	return strings.Join(present, " ")
}

func firstRune(value string) string {
	for _, r := range strings.TrimSpace(value) {
		return strings.ToUpper(string(r))
	}
	return ""
}

type NicknameReservation struct {
	ID         uuid.UUID `json:"id"`
	Nickname   string    `json:"nickname"`
	UserID     uuid.UUID `json:"user_id"`
	ReleasedAt time.Time `json:"released_at"`
	CreatedAt  time.Time `json:"created_at"`
}

var reservedNicknames = map[string]bool{
	"about": true, "admin": true, "api": true, "assets": true, "audit": true,
	"auth": true, "calendar": true, "catalog": true, "deadlines": true,
	"docs": true, "email-change": true, "events": true, "forbidden": true,
	"forgot-password": true, "healthz": true, "help": true, "invite": true,
	"invites": true, "login": true, "me": true, "metrics": true, "null": true,
	"ops": true, "privacy": true, "profile": true, "public": true,
	"readyz": true, "realtime": true, "register": true, "reset-password": true,
	"root": true, "schedule": true, "security": true, "settings": true,
	"static": true, "support": true, "swagger": true, "system": true,
	"terms": true, "timeline": true, "undefined": true, "users": true,
	"verify-email": true,
}

func NicknameReserved(nickname string) bool {
	return reservedNicknames[NormalizeNickname(nickname)]
}

func NicknameFormatValid(nickname string) bool {
	runes := []rune(nickname)
	if len(runes) < NicknameMinLen || len(runes) > NicknameMaxLen {
		return false
	}
	for index, r := range runes {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			continue
		}
		if (r == '-' || r == '_') && index > 0 && index < len(runes)-1 {
			continue
		}
		return false
	}
	return true
}

func NormalizeNickname(nickname string) string {
	return strings.ToLower(strings.TrimSpace(nickname))
}
