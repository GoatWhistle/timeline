package models

import "time"

// RegisterRequest — самостоятельная регистрация или регистрация по приглашению.
type RegisterRequest struct {
	DisplayName string `json:"display_name" example:"Иван Петров"`
	Email       string `json:"email" example:"ivan@example.com"`
	Password    string `json:"password" example:"correct-horse-battery"`
	// InviteToken необязателен: при передаче приглашение принимается той же транзакцией.
	InviteToken string `json:"invite_token,omitempty"`
}

// LoginRequest — вход по email и паролю.
type LoginRequest struct {
	Email    string `json:"email" example:"ivan@example.com"`
	Password string `json:"password" example:"correct-horse-battery"`
}

// TokenRequest — запрос, содержащий только одноразовый токен.
type TokenRequest struct {
	Token string `json:"token" example:"7f9c0f0e2f4b4a1d"`
}

// EmailRequest — запрос, содержащий только адрес электронной почты.
type EmailRequest struct {
	Email string `json:"email" example:"ivan@example.com"`
}

// ResetPasswordRequest — установка нового пароля по одноразовому токену.
type ResetPasswordRequest struct {
	Token    string `json:"token" example:"7f9c0f0e2f4b4a1d"`
	Password string `json:"password" example:"new-correct-horse"`
}

// AuthResponse — результат входа или обновления сессии.
// Токены передаются в HttpOnly cookie, в теле — только профиль и срок действия.
type AuthResponse struct {
	User             MeResponse `json:"user"`
	AccessExpiresAt  time.Time  `json:"access_expires_at"`
	RefreshExpiresAt time.Time  `json:"refresh_expires_at"`
}

// CSRFResponse — выдача CSRF-токена для изменяющих запросов.
type CSRFResponse struct {
	CSRFToken  string `json:"csrf_token" example:"0f2a5c8d1b3e4f60"`
	HeaderName string `json:"header_name" example:"X-CSRF-Token"`
}
