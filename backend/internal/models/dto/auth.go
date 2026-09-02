package dto

import (
	"time"
)

type RegisterRequest struct {
	FirstName   string  `json:"first_name" example:"John"`
	MiddleName  *string `json:"middle_name,omitempty" example:"Fitzgerald"`
	LastName    string  `json:"last_name" example:"Smith"`
	Nickname    string  `json:"nickname" binding:"required" example:"jsmith"`
	Email       string  `json:"email" example:"ivan@example.com"`
	Password    string  `json:"password" example:"correct-horse-battery"`
	InviteToken string  `json:"invite_token,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email" example:"ivan@example.com"`
	Password string `json:"password" example:"correct-horse-battery"`
}

type TokenRequest struct {
	Token string `json:"token" example:"7f9c0f0e2f4b4a1d"`
}

type EmailRequest struct {
	Email string `json:"email" example:"ivan@example.com"`
}

type ResetPasswordRequest struct {
	Token    string `json:"token" example:"7f9c0f0e2f4b4a1d"`
	Password string `json:"password" example:"new-correct-horse"`
}

type AuthResponse struct {
	User             MeResponse `json:"user"`
	AccessExpiresAt  time.Time  `json:"access_expires_at"`
	RefreshExpiresAt time.Time  `json:"refresh_expires_at"`
}

type CSRFResponse struct {
	CSRFToken  string `json:"csrf_token" example:"0f2a5c8d1b3e4f60"`
	HeaderName string `json:"header_name" example:"X-CSRF-Token"`
}

type SessionResponse struct {
	ID         string     `json:"id" example:"se_42ej2s5gh7e8"`
	UserAgent  *string    `json:"user_agent,omitempty" example:"Mozilla/5.0 (X11; Linux x86_64)"`
	IP         *string    `json:"ip,omitempty" example:"203.0.113.7"`
	Label      *string    `json:"label,omitempty" example:"Work laptop"`
	Current    bool       `json:"current" example:"true"`
	CreatedAt  time.Time  `json:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt  time.Time  `json:"expires_at"`
}

type SessionListResponse struct {
	Items []SessionResponse `json:"items"`
}

type UpdateSessionRequest struct {
	Label      *string `json:"label,omitempty" example:"Work laptop"`
	ClearLabel bool    `json:"clear_label,omitempty" example:"false"`
}

type SessionPatch struct {
	Label    *string
	LabelSet bool
}
