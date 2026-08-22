package models

import (
	"time"

	"github.com/google/uuid"
)

// MeResponse — собственный профиль пользователя.
type MeResponse struct {
	ID               uuid.UUID `json:"id"`
	DisplayName      string    `json:"display_name" example:"Иван Петров"`
	Email            string    `json:"email" example:"ivan@example.com"`
	PendingEmail     *string   `json:"pending_email,omitempty"`
	EmailVerified    bool      `json:"email_verified" example:"true"`
	TelegramUsername *string   `json:"telegram_username,omitempty"`
	TelegramLinked   bool      `json:"telegram_linked" example:"false"`
	PreferredChannel *Channel  `json:"preferred_channel,omitempty" enums:"TELEGRAM,EMAIL"`
	IsAdmin          bool      `json:"is_admin" example:"false"`
	IsActive         bool      `json:"is_active" example:"true"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// UpdateProfileRequest — изменение собственного профиля.
// Поля is_admin, telegram_chat_id и password_hash этим endpoint не меняются.
type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name,omitempty" example:"Иван Петров"`
	// PreferredChannel: TELEGRAM, EMAIL либо null для сброса явного выбора.
	PreferredChannel *string `json:"preferred_channel,omitempty" enums:"TELEGRAM,EMAIL"`
	TelegramUsername *string `json:"telegram_username,omitempty" example:"@ivan"`
}

// ChangeEmailRequest — запрос смены основного адреса.
type ChangeEmailRequest struct {
	NewEmail string `json:"new_email" example:"new@example.com"`
	Password string `json:"password" example:"correct-horse-battery"`
}

// TelegramLinkResponse — одноразовая ссылка привязки Telegram.
type TelegramLinkResponse struct {
	DeepLink  string    `json:"deep_link" example:"https://t.me/hackathon_tracker_bot?start=abc123"`
	ExpiresAt time.Time `json:"expires_at"`
}

// UserSummary — минимальные данные пользователя для административного выбора.
type UserSummary struct {
	ID          uuid.UUID `json:"id"`
	DisplayName string    `json:"display_name" example:"Иван Петров"`
	Email       string    `json:"email" example:"ivan@example.com"`
	IsActive    bool      `json:"is_active" example:"true"`
}

// UserPage — страница результатов поиска пользователей.
type UserPage struct {
	Items []UserSummary `json:"items"`
	Meta  PageMeta      `json:"meta"`
}

// InviteResponse — приглашение в административном списке.
type InviteResponse struct {
	ID              uuid.UUID  `json:"id"`
	Email           string     `json:"email" example:"new@example.com"`
	CreatedByUserID uuid.UUID  `json:"created_by_user_id"`
	ExpiresAt       time.Time  `json:"expires_at"`
	AcceptedAt      *time.Time `json:"accepted_at,omitempty"`
	RevokedAt       *time.Time `json:"revoked_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// InvitePage — страница списка приглашений.
type InvitePage struct {
	Items []InviteResponse `json:"items"`
	Meta  PageMeta         `json:"meta"`
}

// CreateInviteRequest — создание приглашения администратором.
type CreateInviteRequest struct {
	Email string `json:"email" example:"new@example.com"`
}

// CreateInviteResponse — созданное приглашение вместе со ссылкой принятия.
type CreateInviteResponse struct {
	Invite     InviteResponse `json:"invite"`
	AcceptLink string         `json:"accept_link" example:"https://tracker.local/invite/abc123"`
}

// InvitePreview — публичный просмотр приглашения по токену.
type InvitePreview struct {
	Email     string    `json:"email" example:"new@example.com"`
	ExpiresAt time.Time `json:"expires_at"`
	Valid     bool      `json:"valid" example:"true"`
}

// AcceptInviteRequest — принятие приглашения с созданием учётной записи.
type AcceptInviteRequest struct {
	Token       string `json:"token" example:"abc123"`
	DisplayName string `json:"display_name" example:"Иван Петров"`
	Password    string `json:"password" example:"correct-horse-battery"`
}
