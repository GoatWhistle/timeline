package dto

import (
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type MeResponse struct {
	ID                   string                   `json:"id" example:"us_42ej2s5gh7e8"`
	FirstName            string                   `json:"first_name" example:"John"`
	MiddleName           *string                  `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName             string                   `json:"last_name" example:"Smith"`
	DisplayName          string                   `json:"display_name" example:"John Smith"`
	LegacyDisplayName    *string                  `json:"legacy_display_name,omitempty" example:"John Smith"`
	Nickname             *string                  `json:"nickname,omitempty" example:"jsmith"`
	ProfilePublic        bool                     `json:"profile_public" example:"false"`
	ProfileVisibility    models.ProfileVisibility `json:"profile_visibility" enums:"public,members,private"`
	PinnedEventIDs       []string                 `json:"pinned_event_ids" example:"ev_gma9hq8a96q5"`
	Theme                models.UserTheme         `json:"theme" example:"system" enums:"dark,light,system"`
	Email                string                   `json:"email" example:"ivan@example.com"`
	PendingEmail         *string                  `json:"pending_email,omitempty"`
	EmailVerified        bool                     `json:"email_verified" example:"true"`
	TelegramUsername     *string                  `json:"telegram_username,omitempty"`
	TelegramLinked       bool                     `json:"telegram_linked" example:"false"`
	NotificationChannels models.ChannelSet        `json:"notification_channels" enums:"TELEGRAM,EMAIL"`
	AvatarURL            *string                  `json:"avatar_url,omitempty" example:"/api/v1/avatars/ab12cd34.png"`
	Bio                  *string                  `json:"bio,omitempty" example:"Backend developer"`
	Locale               string                   `json:"locale" example:"ru" enums:"ru,en"`
	Timezone             string                   `json:"timezone" example:"Europe/Moscow"`
	Shortcuts            models.Shortcuts         `json:"shortcuts"`
	IsAdmin              bool                     `json:"is_admin" example:"false"`
	IsActive             bool                     `json:"is_active" example:"true"`
	CreatedAt            time.Time                `json:"created_at"`
	UpdatedAt            time.Time                `json:"updated_at"`
}

type UpdateProfileRequest struct {
	FirstName            *string  `json:"first_name,omitempty" example:"John"`
	MiddleName           *string  `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName             *string  `json:"last_name,omitempty" example:"Smith"`
	Nickname             *string  `json:"nickname,omitempty" example:"jsmith"`
	ProfileVisibility    *string  `json:"profile_visibility,omitempty" example:"private" enums:"public,members,private"`
	PinnedEventIDs       []string `json:"pinned_event_ids,omitempty" example:"ev_gma9hq8a96q5"`
	Theme                *string  `json:"theme,omitempty" example:"system" enums:"dark,light,system"`
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
	ProfileVisibility     *models.ProfileVisibility
	PinnedEventIDs        []uuid.UUID
	Theme                 *models.UserTheme
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

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" example:"correct-horse-battery"`
	NewPassword     string `json:"new_password" example:"another-horse-battery-staple"`
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
	Nickname        string                `json:"nickname" example:"jsmith"`
	FirstName       string                `json:"first_name" example:"John"`
	MiddleName      *string               `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName        string                `json:"last_name" example:"Smith"`
	DisplayName     string                `json:"display_name" example:"John Smith"`
	AvatarURL       *string               `json:"avatar_url,omitempty" example:"/api/v1/avatars/ab12cd34.png"`
	Bio             *string               `json:"bio,omitempty" example:"Backend developer"`
	MemberSince     time.Time             `json:"member_since"`
	Links           []models.ProfileLink  `json:"links"`
	Events          []PublicProfileEvent  `json:"events"`
	PinnedEvents    []PublicProfileEvent  `json:"pinned_events"`
	MonthlyActivity []MonthlyActivity     `json:"monthly_activity"`
	Summary         *PublicProfileSummary `json:"summary,omitempty"`
}

type MonthlyActivity struct {
	Month string `json:"month" example:"2026-01"`
	Count int    `json:"count" example:"2"`
}

type PublicProfileSummary struct {
	EventCount             int      `json:"event_count" example:"5"`
	TeamCount              int      `json:"team_count" example:"2"`
	OnTimeRegistrationRate *float64 `json:"on_time_registration_rate,omitempty" example:"0.8"`
}

type PublicProfileEvent struct {
	ID       string        `json:"id" example:"ev_gma9hq8a96q5"`
	Title    string        `json:"title" example:"Timeline Hack"`
	Kind     string        `json:"kind" example:"HACKATHON" enums:"HACKATHON,MEETUP"`
	Role     string        `json:"role" example:"participant" enums:"participant"`
	TeamName *string       `json:"team_name,omitempty" example:"Rocket Goats"`
	Outcome  *EventOutcome `json:"outcome,omitempty"`
	StartAt  time.Time     `json:"start_at"`
	EndAt    time.Time     `json:"end_at"`
}

type EventOutcome struct {
	Place  *int    `json:"place,omitempty" example:"1"`
	Amount *string `json:"amount,omitempty" example:"100000"`
}

type UserPage struct {
	Items []UserSummary `json:"items"`
	Meta  PageMeta      `json:"meta"`
}

type ReminderScheduleOccasion struct {
	Occasion   string `json:"occasion" example:"REMINDER_REGISTRATION_DEADLINE" enums:"REMINDER_REGISTRATION_DEADLINE,REMINDER_EVENT_START,REMINDER_STAGE_START,REMINDER_EVENT_END"`
	DaysBefore []int  `json:"days_before" example:"1,3"`
}

type ReminderScheduleResponse struct {
	Occasions      []ReminderScheduleOccasion `json:"occasions"`
	OverdueEnabled bool                       `json:"overdue_enabled" example:"true"`
	Version        int                        `json:"version" example:"1"`
	DayChoices     []int                      `json:"day_choices" example:"1,2,3,7,14"`
}

type UpdateReminderScheduleRequest struct {
	Occasions      []ReminderScheduleOccasion `json:"occasions"`
	OverdueEnabled bool                       `json:"overdue_enabled" example:"true"`
}
