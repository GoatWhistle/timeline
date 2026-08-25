package controllers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// AuthController обслуживает регистрацию, вход, сессии и восстановление доступа.
type AuthController struct {
	svc     AuthService
	cookies CookieOptions
	csrfTTL time.Duration
}

// NewAuthController создаёт контроллер аутентификации.
func NewAuthController(svc AuthService, cookies CookieOptions, csrfTTL time.Duration) *AuthController {
	return &AuthController{svc: svc, cookies: cookies, csrfTTL: csrfTTL}
}

func sessionMeta(r *http.Request) models.SessionMeta {
	return models.SessionMeta{UserAgent: r.UserAgent(), IP: httpx.ClientIP(r)}
}

func (c *AuthController) issue(w http.ResponseWriter, user *models.User, pair *models.TokenPair) {
	c.cookies.SetAuth(w, pair)
	c.cookies.SetCSRF(w, randomToken(), time.Now().Add(c.csrfTTL))
	httpx.JSON(w, http.StatusOK, models.AuthResponse{
		User:             meResponse(user),
		AccessExpiresAt:  pair.AccessExpiresAt,
		RefreshExpiresAt: pair.RefreshExpiresAt,
	})
}

func randomToken() string {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand в поддерживаемых системах не отказывает; аварийное значение
		// не должно молча ослаблять защиту, поэтому паника здесь уместна.
		panic("не удалось получить случайные данные: " + err.Error())
	}
	return hex.EncodeToString(buf)
}

// Register godoc
//
//	@Summary		Регистрация пользователя
//	@Description	Создаёт учётную запись, отправляет письмо подтверждения на 24 часа и открывает сессию.
//	@Description	До подтверждения адреса вход разрешён, продуктовые уведомления по email — нет.
//	@Description	Если передан invite_token, приглашение принимается в той же транзакции.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			request	body		models.RegisterRequest	true	"Данные регистрации"
//	@Success		200		{object}	models.AuthResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse	"email уже занят"
//	@Failure		429		{object}	models.ErrorResponse
//	@Router			/auth/register [post]
func (c *AuthController) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	user, pair, err := c.svc.Register(r.Context(), req, sessionMeta(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.issue(w, user, pair)
}

// Login godoc
//
//	@Summary		Вход по email и паролю
//	@Description	Выдаёт access token на 15 минут и rotating refresh token на 30 дней в HttpOnly cookie.
//	@Description	Ограничение частоты: 10 попыток за 15 минут на пару IP и email.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			request	body		models.LoginRequest	true	"Учётные данные"
//	@Success		200		{object}	models.AuthResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		401		{object}	models.ErrorResponse	"неверные учётные данные или деактивированная запись"
//	@Failure		429		{object}	models.ErrorResponse
//	@Router			/auth/login [post]
func (c *AuthController) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	user, pair, err := c.svc.Login(r.Context(), req, sessionMeta(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.issue(w, user, pair)
}

// Refresh godoc
//
//	@Summary		Обновление сессии
//	@Description	Ротация refresh token. Повторное использование отозванного токена отзывает всю цепочку сессии.
//	@Tags			auth
//	@Produce		json
//	@Success		200	{object}	models.AuthResponse
//	@Failure		401	{object}	models.ErrorResponse
//	@Router			/auth/refresh [post]
func (c *AuthController) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(middleware.RefreshCookie)
	if err != nil || cookie.Value == "" {
		httpx.Error(w, r, models.NewUnauthorized("refresh token отсутствует"))
		return
	}
	user, pair, err := c.svc.Refresh(r.Context(), cookie.Value, sessionMeta(r))
	if err != nil {
		c.cookies.Clear(w)
		httpx.Error(w, r, err)
		return
	}
	c.issue(w, user, pair)
}

// Logout godoc
//
//	@Summary		Выход из текущей сессии
//	@Description	Отзывает refresh token текущей сессии и очищает cookie.
//	@Tags			auth
//	@Produce		json
//	@Success		200	{object}	models.MessageResponse
//	@Router			/auth/logout [post]
func (c *AuthController) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(middleware.RefreshCookie); err == nil && cookie.Value != "" {
		if err := c.svc.Logout(r.Context(), cookie.Value); err != nil {
			httpx.Error(w, r, err)
			return
		}
	}
	c.cookies.Clear(w)
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "сессия завершена"})
}

// LogoutAll godoc
//
//	@Summary		Выход из всех сессий
//	@Description	Отзывает все активные сессии пользователя.
//	@Tags			auth
//	@Produce		json
//	@Security		CookieAuth
//	@Success		200	{object}	models.MessageResponse
//	@Failure		401	{object}	models.ErrorResponse
//	@Router			/auth/logout-all [post]
func (c *AuthController) LogoutAll(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.LogoutAll(r.Context(), middleware.ActorFrom(r)); err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.cookies.Clear(w)
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "все сессии завершены"})
}

// VerifyEmail godoc
//
//	@Summary		Подтверждение email
//	@Description	Потребляет одноразовый токен подтверждения со сроком 24 часа.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			request	body		models.TokenRequest	true	"Токен подтверждения"
//	@Success		200		{object}	models.MessageResponse
//	@Failure		400		{object}	models.ErrorResponse	"токен недействителен или истёк"
//	@Router			/auth/verify-email [post]
func (c *AuthController) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req models.TokenRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.VerifyEmail(r.Context(), req.Token); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "email подтверждён"})
}

// ResendVerification godoc
//
//	@Summary		Повторная отправка письма подтверждения
//	@Description	Ограничение частоты: 5 запросов в час на пару IP и email. Ответ не раскрывает существование учётной записи.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			request	body		models.EmailRequest	true	"Адрес электронной почты"
//	@Success		202		{object}	models.MessageResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		429		{object}	models.ErrorResponse
//	@Router			/auth/verify-email/resend [post]
func (c *AuthController) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req models.EmailRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ResendVerification(r.Context(), req.Email); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusAccepted, models.MessageResponse{Message: "если адрес существует, письмо отправлено"})
}

// ForgotPassword godoc
//
//	@Summary		Запрос восстановления пароля
//	@Description	Выдаёт одноразовый токен на 30 минут. Ответ не раскрывает существование учётной записи.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			request	body		models.EmailRequest	true	"Адрес электронной почты"
//	@Success		202		{object}	models.MessageResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		429		{object}	models.ErrorResponse
//	@Router			/auth/password/forgot [post]
func (c *AuthController) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req models.EmailRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ForgotPassword(r.Context(), req.Email); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusAccepted, models.MessageResponse{Message: "если адрес существует, письмо отправлено"})
}

// ResetPassword godoc
//
//	@Summary		Установка нового пароля
//	@Description	После смены пароля все активные сессии пользователя отзываются.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			request	body		models.ResetPasswordRequest	true	"Токен и новый пароль"
//	@Success		200		{object}	models.MessageResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Router			/auth/password/reset [post]
func (c *AuthController) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req models.ResetPasswordRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ResetPassword(r.Context(), req.Token, req.Password); err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.cookies.Clear(w)
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "пароль изменён, сессии отозваны"})
}

// ConfirmEmailChange godoc
//
//	@Summary		Подтверждение смены email
//	@Description	Переносит pending_email в основной адрес. До подтверждения вход работает по прежнему адресу.
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			request	body		models.TokenRequest	true	"Токен подтверждения"
//	@Success		200		{object}	models.MessageResponse
//	@Failure		400		{object}	models.ErrorResponse
//	@Failure		409		{object}	models.ErrorResponse	"адрес уже занят"
//	@Router			/auth/email-change/confirm [post]
func (c *AuthController) ConfirmEmailChange(w http.ResponseWriter, r *http.Request) {
	var req models.TokenRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ConfirmEmailChange(r.Context(), req.Token); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "адрес обновлён"})
}

// CSRF godoc
//
//	@Summary		Получение CSRF-токена
//	@Description	Выдаёт токен в cookie и в теле ответа. Все изменяющие запросы обязаны передавать его заголовком X-CSRF-Token.
//	@Tags			auth
//	@Produce		json
//	@Success		200	{object}	models.CSRFResponse
//	@Router			/auth/csrf [get]
func (c *AuthController) CSRF(w http.ResponseWriter, r *http.Request) {
	token := randomToken()
	c.cookies.SetCSRF(w, token, time.Now().Add(c.csrfTTL))
	httpx.JSON(w, http.StatusOK, models.CSRFResponse{CSRFToken: token, HeaderName: middleware.CSRFHeader})
}
