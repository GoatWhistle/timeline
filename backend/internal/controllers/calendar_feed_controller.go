package controllers

import (
	"context"
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type CalendarFeedService interface {
	Describe(ctx context.Context, actor models.Actor) (*models.CalendarFeedResponse, error)
	Issue(ctx context.Context, actor models.Actor, rotate bool) (*models.CalendarFeedSecretResponse, error)
	Revoke(ctx context.Context, actor models.Actor) error
	Render(ctx context.Context, secret string) (string, error)
}

type CalendarFeedController struct {
	feeds       CalendarFeedService
	limiter     Limiter
	manageLimit int
	manageWin   time.Duration
	feedLimit   int
	feedWin     time.Duration
}

func NewCalendarFeedController(svc CalendarFeedService, limiter Limiter,
	manageLimit int, manageWin time.Duration, feedLimit int,
	feedWin time.Duration) *CalendarFeedController {
	return &CalendarFeedController{feeds: svc, limiter: limiter,
		manageLimit: manageLimit, manageWin: manageWin,
		feedLimit: feedLimit, feedWin: feedWin}
}

func (c *CalendarFeedController) guard(w http.ResponseWriter, r *http.Request, scope string) bool {
	if c.limiter == nil {
		return true
	}
	actor := middleware.ActorFrom(r)
	if c.limiter.Allow(scope+":"+actor.UserID.String(), c.manageLimit, c.manageWin) {
		return true
	}
	httpx.Error(w, r, models.NewRateLimited("too many calendar feed requests"))
	return false
}

// @Summary		State of the own calendar feed
// @Description	Tells whether a calendar feed is currently issued for the caller and when it
// @Description	was last fetched by a calendar client.
// @Description
// @Description	The address itself is never returned here. The secret exists exactly once, in
// @Description	the response that issued or rotated it (specification 5.6.1): a feed URL is a
// @Description	bearer credential, the database keeps only its hash, and an endpoint that
// @Description	handed it back on demand would turn any read of this resource into a way to
// @Description	recover it. A lost address is replaced by rotation, not recovered.
// @Tags			calendar
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	models.CalendarFeedResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/calendar-feed [get]
func (c *CalendarFeedController) Describe(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "calendar.describe") {
		return
	}
	view, err := c.feeds.Describe(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, view)
}

// @Summary		Issue a calendar feed
// @Description	Creates the caller's calendar feed and returns its address once. The address
// @Description	carries a secret of at least 128 bits; only its hash reaches the database.
// @Description
// @Description	One feed per account (specification 5.6.1). When a feed already exists the
// @Description	call answers 409 rather than silently issuing a second address: rotation is an
// @Description	explicit operation, so that replacing a feed is never something that happens by
// @Description	accident to a subscription living in someone's calendar service.
// @Description
// @Description	The issue is written to the audit log — it is an account security operation of
// @Description	the same kind as revoking a session — but neither the secret nor its hash is
// @Description	recorded there.
// @Tags			calendar
// @Produce		json
// @Security		CookieAuth
// @Success		201	{object}	models.CalendarFeedSecretResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		409	{object}	models.ErrorResponse	"a feed already exists; rotate it instead"
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/calendar-feed [post]
func (c *CalendarFeedController) Create(w http.ResponseWriter, r *http.Request) {
	c.issue(w, r, false, http.StatusCreated)
}

// @Summary		Rotate the calendar feed
// @Description	Revokes the current address and issues a new one in a single transaction. The
// @Description	previous address stops working immediately: every calendar already subscribed
// @Description	to it starts receiving 404 and must be re-subscribed to the new address.
// @Description
// @Description	This is the response to a leaked feed URL. Because the address is a bearer
// @Description	credential stored on third-party servers, there is no narrower remedy: the
// @Description	holder of a leaked URL cannot be identified or blocked individually.
// @Tags			calendar
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	models.CalendarFeedSecretResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/calendar-feed/rotate [post]
func (c *CalendarFeedController) Rotate(w http.ResponseWriter, r *http.Request) {
	c.issue(w, r, true, http.StatusOK)
}

func (c *CalendarFeedController) issue(w http.ResponseWriter, r *http.Request,
	rotate bool, status int) {
	if !c.guard(w, r, "calendar.issue") {
		return
	}
	view, err := c.feeds.Issue(r.Context(), middleware.ActorFrom(r), rotate)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, status, view)
}

// @Summary		Revoke the calendar feed
// @Description	Stops the caller's feed. Idempotent: revoking an absent or already revoked
// @Description	feed answers 204 as well.
// @Description
// @Description	The row is not deleted — it keeps the token hash taken and records that the
// @Description	address was deliberately revoked rather than lost. After this the address
// @Description	answers 404, indistinguishable from one that never existed.
// @Tags			calendar
// @Produce		json
// @Security		CookieAuth
// @Success		204	"the feed is revoked"
// @Failure		401	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/calendar-feed [delete]
func (c *CalendarFeedController) Revoke(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "calendar.revoke") {
		return
	}
	if err := c.feeds.Revoke(r.Context(), middleware.ActorFrom(r)); err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// @Summary		The calendar feed itself
// @Description	Returns the owner's schedule as an iCalendar document (RFC 5545) with the
// @Description	media type text/calendar. This is the only unauthenticated endpoint in the
// @Description	system that returns personal data, and everything about it follows from that
// @Description	(specification 5.6).
// @Description
// @Description	The token in the path is the whole credential: there is no session, no cookie
// @Description	and no CSRF check, because a calendar client sends none of them. The address is
// @Description	fetched by Google, Apple or Microsoft servers rather than by the owner's
// @Description	device, so it cannot be bound to a device or an address range.
// @Description
// @Description	The content is exactly what the owner sees in GET /me/schedule: their assigned
// @Description	published events, the stages of those events and the registration deadline.
// @Description	No other participant, no administrative field and nothing from the personal
// @Description	layer appears here — widening the feed would be a privilege escalation through
// @Description	a channel that has no authentication.
// @Description
// @Description	An unknown, malformed or revoked token answers 404, and so does the feed of a
// @Description	deactivated account. A revoked token and one that never existed are
// @Description	deliberately indistinguishable: 403 would confirm that the address was once
// @Description	real. Rate limiting is keyed on the presented token, since there is no account
// @Description	context until the token has been resolved.
// @Tags			calendar
// @Produce		text/calendar
// @Param			token	path		string	true	"Feed secret"
// @Success		200		{string}	string					"iCalendar document"
// @Failure		404		{object}	models.ErrorResponse	"unknown, revoked or malformed token"
// @Failure		429		{object}	models.ErrorResponse
// @Router			/calendar/{token}/feed.ics [get]
func (c *CalendarFeedController) Feed(w http.ResponseWriter, r *http.Request) {
	token := r.PathValue("token")
	if c.limiter != nil && !c.limiter.Allow("calendar.feed:"+FeedRateKey(token), c.feedLimit, c.feedWin) {
		httpx.Error(w, r, models.NewRateLimited("too many calendar feed requests"))
		return
	}
	body, err := c.feeds.Render(r.Context(), token)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.Header().Set("Content-Type", "text/calendar; charset=utf-8")
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("Content-Disposition", "inline; filename=\"timeline.ics\"")
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write([]byte(body))
	}
}
