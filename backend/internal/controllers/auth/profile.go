package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpsession"
	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/presenter"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type ProfileService interface {
	Get(ctx context.Context, userID uuid.UUID) (*models.User, error)
	Update(ctx context.Context, actor models.Actor, req dto.UpdateProfileRequest) (*models.User, error)
	PinnedEventDisplayIDs(ctx context.Context, u *models.User) ([]string, error)
	StartTelegramLink(ctx context.Context, actor models.Actor) (string, time.Time, error)
	CompleteTelegramLink(ctx context.Context, token, chatID string, username *string) error
	UnlinkTelegram(ctx context.Context, actor models.Actor) error
	UpdateShortcuts(ctx context.Context, actor models.Actor,
		req dto.UpdateShortcutsRequest) (*models.User, error)
	ResetShortcuts(ctx context.Context, actor models.Actor) (*models.User, error)
	NotificationPreferences(ctx context.Context, userID uuid.UUID) ([]models.NotificationPreference, error)
	SetNotificationPreference(ctx context.Context, actor models.Actor,
		occasion models.NotificationOccasion, channel models.Channel, enabled bool,
	) ([]models.NotificationPreference, error)
	RequestEmailChange(ctx context.Context, actor models.Actor, req dto.ChangeEmailRequest) error
	Deactivate(ctx context.Context, actor models.Actor) error
}

type ProfileController struct {
	svc     ProfileService
	cookies httpsession.CookieOptions
	limiter httpsession.Limiter
	limit   int
	window  time.Duration
}

func NewProfileController(svc ProfileService, cookies httpsession.CookieOptions, limiter httpsession.Limiter,
	limit int, window time.Duration) *ProfileController {
	return &ProfileController{svc: svc, cookies: cookies, limiter: limiter,
		limit: limit, window: window}
}

func (c *ProfileController) allow(r *http.Request) bool {
	if c.limiter == nil {
		return true
	}
	return c.limiter.Allow("profile-update:"+middleware.ActorFrom(r).UserID.String(),
		c.limit, c.window)
}

func (c *ProfileController) allowShortcuts(r *http.Request) bool {
	if c.limiter == nil {
		return true
	}
	return c.limiter.Allow("shortcuts-update:"+middleware.ActorFrom(r).UserID.String(),
		c.limit, c.window)
}

// @Summary	Your own profile
// @Tags		profile
// @Produce	json
// @Security	CookieAuth
// @Success	200	{object}	dto.MeResponse
// @Failure	401	{object}	dto.ErrorResponse
// @Router		/me [get]
func (c *ProfileController) Get(w http.ResponseWriter, r *http.Request) {
	user, err := c.svc.Get(r.Context(), middleware.ActorFrom(r).UserID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	resp, err := c.meResponse(r, user)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, resp)
}

func (c *ProfileController) meResponse(r *http.Request, user *models.User) (dto.MeResponse, error) {
	resp := presenter.MeResponse(user)
	pinned, err := c.svc.PinnedEventDisplayIDs(r.Context(), user)
	if err != nil {
		return dto.MeResponse{}, err
	}
	resp.PinnedEventIDs = pinned
	return resp, nil
}

// @Summary		Update your own profile
// @Description	The administrator flag, Telegram chat_id and password are not changed by this endpoint.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.UpdateProfileRequest	true	"Mutable fields"
// @Success		200		{object}	dto.MeResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/me [patch]
func (c *ProfileController) Update(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r) {
		httpx.Error(w, r, models.NewRateLimited("too many profile updates, try again later"))
		return
	}
	var req dto.UpdateProfileRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	user, err := c.svc.Update(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	resp, err := c.meResponse(r, user)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, resp)
}

// @Summary		Telegram link URL
// @Description	Returns a one-time deep link bound to the current user.
// @Description	The chat identifier is set only by this flow.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.TelegramLinkResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/me/telegram/link [post]
func (c *ProfileController) TelegramLink(w http.ResponseWriter, r *http.Request) {
	link, expires, err := c.svc.StartTelegramLink(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.TelegramLinkResponse{DeepLink: link, ExpiresAt: expires})
}

// @Summary	Unlink Telegram
// @Tags		profile
// @Produce	json
// @Security	CookieAuth
// @Success	200	{object}	dto.MessageResponse
// @Failure	401	{object}	dto.ErrorResponse
// @Router		/me/telegram [delete]
func (c *ProfileController) TelegramUnlink(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.UnlinkTelegram(r.Context(), middleware.ActorFrom(r)); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "telegram link removed"})
}

// @Summary		Request an email change
// @Description	The new address is stored as pending_email and becomes primary only after confirmation.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.ChangeEmailRequest	true	"New address and current password"
// @Success		202		{object}	dto.MessageResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"address is already taken"
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/me/email-change [post]
func (c *ProfileController) ChangeEmail(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r) {
		httpx.Error(w, r, models.NewRateLimited("too many email change requests, try again later"))
		return
	}
	var req dto.ChangeEmailRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.RequestEmailChange(r.Context(), middleware.ActorFrom(r), req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusAccepted, dto.MessageResponse{
		Message: "a confirmation message has been sent to the new address",
	})
}

// @Summary		Deactivate your own account
// @Description	Revokes sessions, removes the Telegram link and cancels pending notifications.
// @Description	Reactivation is performed by an administrator.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.MessageResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/me/deactivate [post]
func (c *ProfileController) Deactivate(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.Deactivate(r.Context(), middleware.ActorFrom(r)); err != nil {
		httpx.Error(w, r, err)
		return
	}
	c.cookies.Clear(w)
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "the account is deactivated"})
}
