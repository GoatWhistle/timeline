package models

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type MeResponse struct {
	ID                uuid.UUID `json:"id"`
	FirstName         string    `json:"first_name" example:"John"`
	MiddleName        *string   `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName          string    `json:"last_name" example:"Smith"`
	DisplayName       string    `json:"display_name" example:"John Smith"`
	LegacyDisplayName *string   `json:"legacy_display_name,omitempty" example:"John Smith"`
	Nickname          *string   `json:"nickname,omitempty" example:"jsmith"`
	ProfilePublic     bool      `json:"profile_public" example:"false"`
	Email             string    `json:"email" example:"ivan@example.com"`
	PendingEmail      *string   `json:"pending_email,omitempty"`
	EmailVerified     bool      `json:"email_verified" example:"true"`
	TelegramUsername  *string   `json:"telegram_username,omitempty"`
	TelegramLinked    bool      `json:"telegram_linked" example:"false"`
	PreferredChannel  *Channel  `json:"preferred_channel,omitempty" enums:"TELEGRAM,EMAIL"`
	AvatarURL         *string   `json:"avatar_url,omitempty" example:"https://example.com/a.png"`
	Bio               *string   `json:"bio,omitempty" example:"Backend developer"`
	Locale            string    `json:"locale" example:"ru" enums:"ru,en"`
	Timezone          string    `json:"timezone" example:"Europe/Moscow"`
	Shortcuts         Shortcuts `json:"shortcuts"`
	IsAdmin           bool      `json:"is_admin" example:"false"`
	IsActive          bool      `json:"is_active" example:"true"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type UpdateProfileRequest struct {
	FirstName        *string `json:"first_name,omitempty" example:"John"`
	MiddleName       *string `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName         *string `json:"last_name,omitempty" example:"Smith"`
	Nickname         *string `json:"nickname,omitempty" example:"jsmith"`
	ProfilePublic    *bool   `json:"profile_public,omitempty" example:"false"`
	PreferredChannel *string `json:"preferred_channel,omitempty" enums:"TELEGRAM,EMAIL"`
	TelegramUsername *string `json:"telegram_username,omitempty" example:"@ivan"`
	AvatarURL        *string `json:"avatar_url,omitempty" example:"https://example.com/a.png"`
	Bio              *string `json:"bio,omitempty" example:"Backend developer"`
	Locale           *string `json:"locale,omitempty" example:"en" enums:"ru,en"`
	Timezone         *string `json:"timezone,omitempty" example:"Asia/Tokyo"`
}

type ProfilePatch struct {
	FirstName             *string
	MiddleName            *string
	ClearMiddleName       bool
	LastName              *string
	Nickname              *string
	ClearNickname         bool
	ProfilePublic         *bool
	TelegramUsername      *string
	ClearTelegramUsername bool
	PreferredChannel      *Channel
	ClearPreferredChannel bool
	AvatarURL             *string
	ClearAvatarURL        bool
	Bio                   *string
	ClearBio              bool
	Locale                *string
	Timezone              *string
}

type UpdateShortcutsRequest struct {
	Shortcuts Shortcuts `json:"shortcuts"`
}

type ShortcutsResponse struct {
	Shortcuts Shortcuts `json:"shortcuts"`
}

type ChangeEmailRequest struct {
	NewEmail string `json:"new_email" example:"new@example.com"`
	Password string `json:"password" example:"correct-horse-battery"`
}

type TelegramLinkResponse struct {
	DeepLink  string    `json:"deep_link" example:"https://t.me/timeline_bot?start=abc123"`
	ExpiresAt time.Time `json:"expires_at"`
}

type UserSummary struct {
	ID          uuid.UUID `json:"id"`
	FirstName   string    `json:"first_name" example:"John"`
	MiddleName  *string   `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName    string    `json:"last_name" example:"Smith"`
	DisplayName string    `json:"display_name" example:"John Smith"`
	Nickname    *string   `json:"nickname,omitempty" example:"jsmith"`
	Email       string    `json:"email" example:"ivan@example.com"`
	IsActive    bool      `json:"is_active" example:"true"`
}

func (u *UserSummary) Fill(locale string) {
	u.DisplayName = FormatListName(locale, u.FirstName, u.MiddleName, u.LastName)
}

func FillUserSummaries(items []UserSummary, locale string) {
	for index := range items {
		items[index].Fill(locale)
	}
}

type PublicProfileResponse struct {
	Nickname    string               `json:"nickname" example:"jsmith"`
	FirstName   string               `json:"first_name" example:"John"`
	MiddleName  *string              `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName    string               `json:"last_name" example:"Smith"`
	DisplayName string               `json:"display_name" example:"John Smith"`
	AvatarURL   *string              `json:"avatar_url,omitempty" example:"https://example.com/a.png"`
	Bio         *string              `json:"bio,omitempty" example:"Backend developer"`
	Events      []PublicProfileEvent `json:"events"`
}

type PublicProfileEvent struct {
	ID      uuid.UUID `json:"id"`
	Title   string    `json:"title" example:"Timeline Hack"`
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
}

type UserPage struct {
	Items []UserSummary `json:"items"`
	Meta  PageMeta      `json:"meta"`
}

type InviteResponse struct {
	ID              uuid.UUID  `json:"id"`
	Email           string     `json:"email" example:"new@example.com"`
	CreatedByUserID uuid.UUID  `json:"created_by_user_id"`
	ExpiresAt       time.Time  `json:"expires_at"`
	AcceptedAt      *time.Time `json:"accepted_at,omitempty"`
	RevokedAt       *time.Time `json:"revoked_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

type InvitePage struct {
	Items []InviteResponse `json:"items"`
	Meta  PageMeta         `json:"meta"`
}

type CreateInviteRequest struct {
	Email string `json:"email" example:"new@example.com"`
}

type CreateInviteResponse struct {
	Invite     InviteResponse `json:"invite"`
	AcceptLink string         `json:"accept_link" example:"https://tracker.local/invite/abc123"`
}

type InvitePreview struct {
	Email     string    `json:"email" example:"new@example.com"`
	ExpiresAt time.Time `json:"expires_at"`
	Valid     bool      `json:"valid" example:"true"`
}

type AcceptInviteRequest struct {
	Token      string  `json:"token" example:"abc123"`
	FirstName  string  `json:"first_name" example:"John"`
	MiddleName *string `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName   string  `json:"last_name" example:"Smith"`
	Password   string  `json:"password" example:"correct-horse-battery"`
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
