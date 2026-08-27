package models

import "time"

type RegisterRequest struct {
	DisplayName string `json:"display_name" example:"John Smith"`
	Email       string `json:"email" example:"ivan@example.com"`
	Password    string `json:"password" example:"correct-horse-battery"`
	InviteToken string `json:"invite_token,omitempty"`
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
