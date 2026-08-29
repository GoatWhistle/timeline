package models

import (
	"strings"
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
	AvatarURL        *string    `json:"avatar_url,omitempty"`
	Bio              *string    `json:"bio,omitempty"`
	GithubURL        *string    `json:"github_url,omitempty"`
	WebsiteURL       *string    `json:"website_url,omitempty"`
	Locale           string     `json:"locale"`
	Timezone         string     `json:"timezone"`
	Shortcuts        Shortcuts  `json:"shortcuts"`
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

const (
	ShortcutMaxActions   = 64
	ShortcutMaxActionLen = 64
	ShortcutMaxComboLen  = 64
	ShortcutMaxSteps     = 2
)

type Shortcuts map[string]string

var shortcutModifiers = map[string]int{"mod": 1, "alt": 2, "shift": 3}

var shortcutNamedKeys = map[string]bool{
	"escape": true, "enter": true, "tab": true, "space": true, "backspace": true,
	"delete": true, "home": true, "end": true, "pageup": true, "pagedown": true,
	"arrowup": true, "arrowdown": true, "arrowleft": true, "arrowright": true,
	"f1": true, "f2": true, "f3": true, "f4": true, "f5": true, "f6": true,
	"f7": true, "f8": true, "f9": true, "f10": true, "f11": true, "f12": true,
}

var shortcutReserved = map[string]bool{
	"tab": true, "escape": true, "enter": true, "backspace": true,
	"mod+w": true, "mod+t": true, "mod+n": true, "mod+q": true, "mod+r": true,
	"mod+l": true, "mod+p": true, "mod+s": true, "mod+f": true, "mod+d": true,
	"mod+shift+w": true, "mod+shift+t": true, "mod+shift+n": true, "mod+shift+q": true,
	"mod+tab": true, "alt+tab": true, "mod+shift+tab": true,
	"f5": true, "f11": true, "f12": true,
}

func ShortcutReserved(combo string) bool {
	for _, step := range strings.Split(combo, " ") {
		if shortcutReserved[step] {
			return true
		}
	}
	return false
}

func ShortcutStepValid(step string) bool {
	parts := strings.Split(step, "+")
	key := parts[len(parts)-1]
	seen := 0
	for _, modifier := range parts[:len(parts)-1] {
		rank, ok := shortcutModifiers[modifier]
		if !ok || rank <= seen {
			return false
		}
		seen = rank
	}
	if shortcutNamedKeys[key] {
		return true
	}
	return len([]rune(key)) == 1 && key == strings.ToLower(key) && key != " "
}

func ShortcutComboValid(combo string) bool {
	steps := strings.Split(combo, " ")
	if len(steps) == 0 || len(steps) > ShortcutMaxSteps {
		return false
	}
	for _, step := range steps {
		if step == "" || !ShortcutStepValid(step) {
			return false
		}
	}
	return len(steps) == 1 || !strings.Contains(steps[0], "+")
}
