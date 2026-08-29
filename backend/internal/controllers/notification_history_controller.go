package controllers

import (
	"context"
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type NotificationHistoryService interface {
	History(ctx context.Context, actor models.Actor,
		page models.Page) ([]models.NotificationHistoryItem, int64, error)
}

type NotificationHistoryController struct {
	svc     NotificationHistoryService
	limiter Limiter
	limit   int
	window  time.Duration
	pageDef int
	pageMax int
}

func NewNotificationHistoryController(svc NotificationHistoryService, limiter Limiter,
	limit int, window time.Duration, pageDef, pageMax int) *NotificationHistoryController {
	return &NotificationHistoryController{
		svc: svc, limiter: limiter, limit: limit, window: window,
		pageDef: pageDef, pageMax: pageMax,
	}
}

func (c *NotificationHistoryController) guard(w http.ResponseWriter, r *http.Request) bool {
	if c.limiter == nil {
		return true
	}
	actor := middleware.ActorFrom(r)
	if c.limiter.Allow("notification-history:"+actor.UserID.String(), c.limit, c.window) {
		return true
	}
	httpx.Error(w, r, models.NewRateLimited("too many requests"))
	return false
}

// @Summary		Own notification history
// @Description	What the system sent the caller and when: date, type, channel and a short
// @Description	preview. Read-only and scoped to the caller by recipient — an administrator
// @Description	reading this endpoint sees their own notifications, not anyone else's.
// @Description
// @Description	The preview is a short excerpt, never the whole payload. Specification 4 clears
// @Description	payload_json after 90 days while the row itself must survive for deduplication,
// @Description	so an older entry returns no preview and no event title and is marked redacted.
// @Description	The screen is required to render that state rather than treat it as an error.
// @Tags			notifications
// @Produce		json
// @Security		CookieAuth
// @Param			page		query		int	false	"Page number"	default(1)
// @Param			page_size	query		int	false	"Page size"		default(50)
// @Success		200			{object}	models.NotificationHistoryResponse
// @Failure		400			{object}	models.ErrorResponse
// @Failure		401			{object}	models.ErrorResponse
// @Failure		429			{object}	models.ErrorResponse
// @Router			/me/notifications [get]
func (c *NotificationHistoryController) List(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r) {
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.History(r.Context(), middleware.ActorFrom(r), page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.NotificationHistoryResponse{
		Items: items, Meta: httpx.Meta(page, total),
	})
}
