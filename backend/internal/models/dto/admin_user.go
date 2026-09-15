package dto

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type AdminUserSummary struct {
	ID               string     `json:"id" example:"us_42ej2s5gh7e8"`
	FirstName        string     `json:"first_name" example:"John"`
	MiddleName       *string    `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName         string     `json:"last_name" example:"Smith"`
	DisplayName      string     `json:"display_name" example:"John Smith"`
	Nickname         *string    `json:"nickname,omitempty" example:"jsmith"`
	Email            string     `json:"email" example:"ivan@example.com"`
	IsActive         bool       `json:"is_active" example:"true"`
	IsAdmin          bool       `json:"is_admin" example:"false"`
	AvatarURL        *string    `json:"avatar_url,omitempty" example:"/api/v1/avatars/ab12cd34.png"`
	TelegramUsername *string    `json:"telegram_username,omitempty" example:"@ivan"`
	Locale           string     `json:"locale" example:"en"`
	Timezone         string     `json:"timezone" example:"Europe/Moscow"`
	Bio              *string    `json:"bio,omitempty" example:"Backend developer"`
	EmailVerifiedAt  *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func (u *AdminUserSummary) Fill(locale string) {
	u.DisplayName = models.FormatListName(locale, u.FirstName, u.MiddleName, u.LastName)
}

type AdminUserPage struct {
	Items []AdminUserSummary `json:"items"`
	Meta  PageMeta           `json:"meta"`
}
