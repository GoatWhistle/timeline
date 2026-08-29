package controllers

import (
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type SystemEventController struct {
	svc     SystemEventService
	limiter Limiter
	limit   int
	window  time.Duration
	pageDef int
	pageMax int
}

func NewSystemEventController(svc SystemEventService, limiter Limiter, limit int,
	window time.Duration, pageDef, pageMax int) *SystemEventController {
	return &SystemEventController{svc: svc, limiter: limiter, limit: limit, window: window,
		pageDef: pageDef, pageMax: pageMax}
}

func (c *SystemEventController) allow(w http.ResponseWriter, r *http.Request, actor models.Actor) bool {
	if c.limiter == nil || c.limiter.Allow("events:"+actor.UserID.String(), c.limit, c.window) {
		return true
	}
	httpx.Error(w, r, models.NewRateLimited("too many event feed requests, try again later"))
	return false
}

// @Summary		Own event feed
// @Description	The system event bus, not the notification queue of specification section 9. A row here
// @Description	mirrors something that happened; it never competes with Telegram or email for delivery
// @Description	and never enters the deduplication and retry machinery of a Notification.
// @Description
// @Description	The feed returns exactly two audiences: events addressed to the caller personally and,
// @Description	for an administrator, events addressed to administrators. There is no way to read
// @Description	somebody else's feed.
// @Tags			events-feed
// @Produce		json
// @Security		CookieAuth
// @Param			unread		query		bool	false	"Return only entries the caller has not read"
// @Param			page		query		int		false	"Page number, from 1"
// @Param			page_size	query		int		false	"Page size"
// @Success		200			{object}	models.SystemEventPage
// @Failure		400			{object}	models.ErrorResponse
// @Failure		401			{object}	models.ErrorResponse
// @Failure		429			{object}	models.ErrorResponse
// @Router			/me/events-feed [get]
func (c *SystemEventController) List(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	if !c.allow(w, r, actor) {
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	unread, err := httpx.QueryBool(r, "unread")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.List(r.Context(), actor, unread, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.SystemEventPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Unread event count
// @Description	The number the bell shows. Requested over REST on connect; the socket only sends the
// @Description	delta afterwards, so the counter is correct even when the socket never opens.
// @Tags			events-feed
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	models.UnreadCountResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/events-feed/unread-count [get]
func (c *SystemEventController) UnreadCount(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	if !c.allow(w, r, actor) {
		return
	}
	count, err := c.svc.UnreadCount(r.Context(), actor)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.UnreadCountResponse{Unread: count})
}

// @Summary		Mark events as read
// @Description	Marks the listed events read for the caller. An empty list marks the whole visible feed.
// @Description	Identifiers outside the caller's audience are ignored rather than reported: the endpoint
// @Description	must not become a way to probe which events exist.
// @Tags			events-feed
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		models.MarkReadRequest	true	"Identifiers to mark, empty for all"
// @Success		200		{object}	models.UnreadCountResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/events-feed/read [post]
func (c *SystemEventController) MarkRead(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	if !c.allow(w, r, actor) {
		return
	}
	var req models.MarkReadRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if _, err := c.svc.MarkRead(r.Context(), actor, req.IDs); err != nil {
		httpx.Error(w, r, err)
		return
	}
	count, err := c.svc.UnreadCount(r.Context(), actor)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.UnreadCountResponse{Unread: count})
}
