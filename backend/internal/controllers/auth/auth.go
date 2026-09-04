package auth

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpsession"
	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/presenter"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Controller struct {
	svc     AuthService
	cookies httpsession.CookieOptions
	csrfTTL time.Duration
}

func NewController(svc AuthService, cookies httpsession.CookieOptions, csrfTTL time.Duration) *Controller {
	return &Controller{svc: svc, cookies: cookies, csrfTTL: csrfTTL}
}

func sessionMeta(r *http.Request) models.SessionMeta {
	return models.SessionMeta{UserAgent: r.UserAgent(), IP: httpx.ClientIP(r)}
}

func (c *Controller) issue(w http.ResponseWriter, user *models.User, pair *models.TokenPair) {
	c.cookies.SetAuth(w, pair)
	c.cookies.SetCSRF(w, randomToken(), time.Now().Add(c.csrfTTL))
	httpx.JSON(w, http.StatusOK, dto.AuthResponse{
		User:             presenter.MeResponse(user),
		AccessExpiresAt:  pair.AccessExpiresAt,
		RefreshExpiresAt: pair.RefreshExpiresAt,
	})
}

func randomToken() string {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		panic("failed to obtain random data: " + err.Error())
	}
	return hex.EncodeToString(buf)
}

// @Summary		Register a user
// @Description	Creates an account, sends a confirmation email valid for 24 hours and opens a session.
// @Description	Sign-in is allowed before the address is confirmed; product email notifications are not.
// @Description	If invite_token is supplied, the invite is accepted in the same transaction.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Param			request	body		dto.RegisterRequest	true	"Registration payload"
// @Success		200		{object}	dto.AuthResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"email or nickname is already taken"
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/auth/register [post]
func (c *Controller) Register(w http.ResponseWriter, r *http.Request) {
	var req dto.RegisterRequest
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

// @Summary		Sign in with email and password
// @Description	Issues a 15-minute access token and a rotating 30-day refresh token in HttpOnly cookies.
// @Description	Rate limit: 10 attempts per 15 minutes per IP and email pair.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Param			request	body		dto.LoginRequest	true	"Credentials"
// @Success		200		{object}	dto.AuthResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse	"invalid credentials or a deactivated account"
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/auth/login [post]
func (c *Controller) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
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

// @Summary		Refresh the session
// @Description	Rotates the refresh token. Reusing a revoked token revokes the entire session chain.
// @Tags			auth
// @Produce		json
// @Success		200	{object}	dto.AuthResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/auth/refresh [post]
func (c *Controller) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(middleware.RefreshCookie)
	if err != nil || cookie.Value == "" {
		httpx.Error(w, r, models.NewUnauthorized("refresh token is missing"))
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

// @Summary		Sign out of the current session
// @Description	Revokes the refresh token of the current session and clears the cookies.
// @Tags			auth
// @Produce		json
// @Success		200	{object}	dto.MessageResponse
// @Router			/auth/logout [post]
func (c *Controller) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(middleware.RefreshCookie); err == nil && cookie.Value != "" {
		if err := c.svc.Logout(r.Context(), cookie.Value); err != nil {
			httpx.Error(w, r, err)
			return
		}
	}
	c.cookies.Clear(w)
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "session terminated"})
}

// @Summary		Sign out of all sessions
// @Description	Revokes every active session of the user.
// @Tags			auth
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.MessageResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/auth/logout-all [post]
func (c *Controller) LogoutAll(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.LogoutAll(r.Context(), middleware.ActorFrom(r)); err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.cookies.Clear(w)
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "all sessions terminated"})
}

// @Summary		Confirm an email address
// @Description	Consumes a one-time confirmation token valid for 24 hours.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Param			request	body		dto.TokenRequest	true	"Confirmation token"
// @Success		200		{object}	dto.MessageResponse
// @Failure		400		{object}	dto.ErrorResponse	"the token is invalid or has expired"
// @Router			/auth/verify-email [post]
func (c *Controller) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req dto.TokenRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.VerifyEmail(r.Context(), req.Token); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "email confirmed"})
}

// @Summary		Resend the confirmation email
// @Description	Rate limit: 5 requests per hour per IP and email pair. The response does not disclose whether an account exists.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Param			request	body		dto.EmailRequest	true	"Email address"
// @Success		202		{object}	dto.MessageResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/auth/verify-email/resend [post]
func (c *Controller) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req dto.EmailRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ResendVerification(r.Context(), req.Email); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusAccepted, dto.MessageResponse{Message: "if the address exists, a message has been sent"})
}

// @Summary		Request a password reset
// @Description	Issues a one-time token valid for 30 minutes. The response does not disclose whether an account exists.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Param			request	body		dto.EmailRequest	true	"Email address"
// @Success		202		{object}	dto.MessageResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/auth/password/forgot [post]
func (c *Controller) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req dto.EmailRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ForgotPassword(r.Context(), req.Email); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusAccepted, dto.MessageResponse{Message: "if the address exists, a message has been sent"})
}

// @Summary		Set a new password
// @Description	After a password change every active session of the user is revoked.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Param			request	body		dto.ResetPasswordRequest	true	"Token and new password"
// @Success		200		{object}	dto.MessageResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Router			/auth/password/reset [post]
func (c *Controller) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req dto.ResetPasswordRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ResetPassword(r.Context(), req.Token, req.Password); err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.cookies.Clear(w)
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "password changed, sessions revoked"})
}

// @Summary		Confirm an email change
// @Description	Promotes pending_email to the primary address. Until confirmation, sign-in uses the previous address.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Param			request	body		dto.TokenRequest	true	"Confirmation token"
// @Success		200		{object}	dto.MessageResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"address is already taken"
// @Router			/auth/email-change/confirm [post]
func (c *Controller) ConfirmEmailChange(w http.ResponseWriter, r *http.Request) {
	var req dto.TokenRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ConfirmEmailChange(r.Context(), req.Token); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "email updated"})
}
