package dto

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type MeResponse struct {
	ID                   string            `json:"id" example:"us_42ej2s5gh7e8"`
	FirstName            string            `json:"first_name" example:"John"`
	MiddleName           *string           `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName             string            `json:"last_name" example:"Smith"`
	DisplayName          string            `json:"display_name" example:"John Smith"`
	LegacyDisplayName    *string           `json:"legacy_display_name,omitempty" example:"John Smith"`
	Nickname             *string           `json:"nickname,omitempty" example:"jsmith"`
	ProfilePublic        bool              `json:"profile_public" example:"false"`
	Email                string            `json:"email" example:"ivan@example.com"`
	PendingEmail         *string           `json:"pending_email,omitempty"`
	EmailVerified        bool              `json:"email_verified" example:"true"`
	TelegramUsername     *string           `json:"telegram_username,omitempty"`
	TelegramLinked       bool              `json:"telegram_linked" example:"false"`
	NotificationChannels models.ChannelSet `json:"notification_channels" enums:"TELEGRAM,EMAIL"`
	AvatarURL            *string           `json:"avatar_url,omitempty" example:"/api/v1/avatars/ab12cd34.png"`
	Bio                  *string           `json:"bio,omitempty" example:"Backend developer"`
	Locale               string            `json:"locale" example:"ru" enums:"ru,en"`
	Timezone             string            `json:"timezone" example:"Europe/Moscow"`
	Shortcuts            models.Shortcuts  `json:"shortcuts"`
	IsAdmin              bool              `json:"is_admin" example:"false"`
	IsActive             bool              `json:"is_active" example:"true"`
	CreatedAt            time.Time         `json:"created_at"`
	UpdatedAt            time.Time         `json:"updated_at"`
}

type UpdateProfileRequest struct {
	FirstName            *string  `json:"first_name,omitempty" example:"John"`
	MiddleName           *string  `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName             *string  `json:"last_name,omitempty" example:"Smith"`
	Nickname             *string  `json:"nickname,omitempty" example:"jsmith"`
	ProfilePublic        *bool    `json:"profile_public,omitempty" example:"false"`
	NotificationChannels []string `json:"notification_channels,omitempty" enums:"TELEGRAM,EMAIL"`
	TelegramUsername     *string  `json:"telegram_username,omitempty" example:"@ivan"`
	Bio                  *string  `json:"bio,omitempty" example:"Backend developer"`
	Locale               *string  `json:"locale,omitempty" example:"en" enums:"ru,en"`
	Timezone             *string  `json:"timezone,omitempty" example:"Asia/Tokyo"`
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
	NotificationChannels  *models.ChannelSet
	AvatarURL             *string
	ClearAvatarURL        bool
	Bio                   *string
	ClearBio              bool
	Locale                *string
	Timezone              *string
}

type UpdateShortcutsRequest struct {
	Shortcuts models.Shortcuts `json:"shortcuts"`
}

type ShortcutsResponse struct {
	Shortcuts models.Shortcuts `json:"shortcuts"`
}

type NotificationPreferencesResponse struct {
	Preferences []models.NotificationPreference `json:"preferences"`
}

type UpdateNotificationPreferenceRequest struct {
	Enabled bool `json:"enabled" example:"false"`
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
	ID          string  `json:"id" example:"us_42ej2s5gh7e8"`
	FirstName   string  `json:"first_name" example:"John"`
	MiddleName  *string `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName    string  `json:"last_name" example:"Smith"`
	DisplayName string  `json:"display_name" example:"John Smith"`
	Nickname    *string `json:"nickname,omitempty" example:"jsmith"`
	Email       string  `json:"email" example:"ivan@example.com"`
	IsActive    bool    `json:"is_active" example:"true"`
}

func (u *UserSummary) Fill(locale string) {
	u.DisplayName = models.FormatListName(locale, u.FirstName, u.MiddleName, u.LastName)
}

type PublicProfileResponse struct {
	Nickname    string               `json:"nickname" example:"jsmith"`
	FirstName   string               `json:"first_name" example:"John"`
	MiddleName  *string              `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName    string               `json:"last_name" example:"Smith"`
	DisplayName string               `json:"display_name" example:"John Smith"`
	AvatarURL   *string              `json:"avatar_url,omitempty" example:"/api/v1/avatars/ab12cd34.png"`
	Bio         *string              `json:"bio,omitempty" example:"Backend developer"`
	Events      []PublicProfileEvent `json:"events"`
}

type PublicProfileEvent struct {
	ID      string    `json:"id" example:"ev_gma9hq8a96q5"`
	Title   string    `json:"title" example:"Timeline Hack"`
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
}

type UserPage struct {
	Items []UserSummary `json:"items"`
	Meta  PageMeta      `json:"meta"`
}

type InviteResponse struct {
	ID              string     `json:"id" example:"in_42ej2s5gh7e8"`
	Email           string     `json:"email" example:"new@example.com"`
	CreatedByUserID string     `json:"created_by_user_id" example:"us_42ej2s5gh7e8"`
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
	Nickname   string  `json:"nickname" binding:"required" example:"jsmith"`
	Password   string  `json:"password" example:"correct-horse-battery"`
}
