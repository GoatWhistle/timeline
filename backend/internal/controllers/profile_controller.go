package controllers

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type ProfileService interface {
	Get(ctx context.Context, userID uuid.UUID) (*models.User, error)
	Update(ctx context.Context, actor models.Actor, req models.UpdateProfileRequest) (*models.User, error)
	StartTelegramLink(ctx context.Context, actor models.Actor) (string, time.Time, error)
	UnlinkTelegram(ctx context.Context, actor models.Actor) error
	RequestEmailChange(ctx context.Context, actor models.Actor, req models.ChangeEmailRequest) error
	Deactivate(ctx context.Context, actor models.Actor) error
}

type ProfileController struct {
	svc     ProfileService
	cookies CookieOptions
}

func NewProfileController(svc ProfileService, cookies CookieOptions) *ProfileController {
	return &ProfileController{svc: svc, cookies: cookies}
}

// @Summary	Your own profile
// @Tags		profile
// @Produce	json
// @Security	CookieAuth
// @Success	200	{object}	models.MeResponse
// @Failure	401	{object}	models.ErrorResponse
// @Router		/me [get]
func (c *ProfileController) Get(w http.ResponseWriter, r *http.Request) {
	user, err := c.svc.Get(r.Context(), middleware.ActorFrom(r).UserID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, meResponse(user))
}

// @Summary		Update your own profile
// @Description	The administrator flag, Telegram chat_id and password are not changed by this endpoint.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		models.UpdateProfileRequest	true	"Mutable fields"
// @Success		200		{object}	models.MeResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Router			/me [patch]
func (c *ProfileController) Update(w http.ResponseWriter, r *http.Request) {
	var req models.UpdateProfileRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	user, err := c.svc.Update(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, meResponse(user))
}

// @Summary		Telegram link URL
// @Description	Returns a one-time deep link bound to the current user.
// @Description	The chat identifier is set only by this flow.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	models.TelegramLinkResponse
// @Failure		401	{object}	models.ErrorResponse
// @Router			/me/telegram/link [post]
func (c *ProfileController) TelegramLink(w http.ResponseWriter, r *http.Request) {
	link, expires, err := c.svc.StartTelegramLink(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.TelegramLinkResponse{DeepLink: link, ExpiresAt: expires})
}

// @Summary	Unlink Telegram
// @Tags		profile
// @Produce	json
// @Security	CookieAuth
// @Success	200	{object}	models.MessageResponse
// @Failure	401	{object}	models.ErrorResponse
// @Router		/me/telegram [delete]
func (c *ProfileController) TelegramUnlink(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.UnlinkTelegram(r.Context(), middleware.ActorFrom(r)); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "telegram link removed"})
}

// @Summary		Request an email change
// @Description	The new address is stored as pending_email and becomes primary only after confirmation.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		models.ChangeEmailRequest	true	"New address and current password"
// @Success		202		{object}	models.MessageResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"address is already taken"
// @Router			/me/email-change [post]
func (c *ProfileController) ChangeEmail(w http.ResponseWriter, r *http.Request) {
	var req models.ChangeEmailRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.RequestEmailChange(r.Context(), middleware.ActorFrom(r), req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusAccepted, models.MessageResponse{
		Message: "a confirmation message has been sent to the new address",
	})
}

// @Summary		Deactivate your own account
// @Description	Revokes sessions, removes the Telegram link and cancels pending notifications.
// @Description	Reactivation is performed by an administrator.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	models.MessageResponse
// @Failure		401	{object}	models.ErrorResponse
// @Router			/me/deactivate [post]
func (c *ProfileController) Deactivate(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.Deactivate(r.Context(), middleware.ActorFrom(r)); err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.cookies.Clear(w)
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "the account is deactivated"})
}
