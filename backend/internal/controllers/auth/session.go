package auth

import (
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models"
)

type SessionController struct {
	svc     AuthService
	cookies shared.CookieOptions
	limiter shared.Limiter
	limit   int
	window  time.Duration
}

func NewSessionController(svc AuthService, cookies shared.CookieOptions, limiter shared.Limiter,
	limit int, window time.Duration) *SessionController {
	return &SessionController{svc: svc, cookies: cookies, limiter: limiter, limit: limit, window: window}
}

func (c *SessionController) allow(r *http.Request, scope string) bool {
	if c.limiter == nil {
		return true
	}
	return c.limiter.Allow(scope+":"+middleware.ActorFrom(r).UserID.String(), c.limit, c.window)
}

// @Summary		Own active sessions
// @Description	Every active session of the calling account: the device that opened it, the address
// @Description	it was opened from, when it was opened, when it was last used and when it expires.
// @Description	One entry carries current=true — the session this very request authenticated with,
// @Description	determined by the session identifier inside the access token.
// @Description
// @Description	Only the caller's own sessions are returned, and only to their owner. The user agent
// @Description	and the address are personal data of the account holder: no other account reaches them
// @Description	through this endpoint, an administrator included. Revoked and expired sessions are not
// @Description	listed — the endpoint shows what is live now, it is not a sign-in history.
// @Tags			auth
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	models.SessionListResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/sessions [get]
func (c *SessionController) List(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r, "sessions-list") {
		httpx.Error(w, r, models.NewRateLimited("too many session requests, try again later"))
		return
	}
	items, err := c.svc.ListSessions(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.SessionListResponse{Items: items})
}

// @Summary		Terminate one own session
// @Description	Revokes the refresh token of a single session, leaving the other devices signed in.
// @Description	Repeating the call on an already revoked or expired session succeeds as well.
// @Description
// @Description	The session must belong to the caller. An identifier of somebody else's session is
// @Description	answered with 404 rather than 403: the very existence of another account's session
// @Description	must not be disclosed. Terminating the current session is allowed and clears the
// @Description	cookies of this response, which makes it equivalent to signing out.
// @Description
// @Description	The outstanding access token stays valid for the rest of its 15 minutes: revocation
// @Description	ends the refresh chain, it does not reach a token already issued.
// @Tags			auth
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Session identifier"	format(uuid)
// @Success		200	{object}	models.MessageResponse
// @Failure		400	{object}	models.ErrorResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse	"the session does not exist or belongs to another account"
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/sessions/{id} [delete]
func (c *SessionController) Revoke(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r, "sessions-revoke") {
		httpx.Error(w, r, models.NewRateLimited("too many session requests, try again later"))
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	current, err := c.svc.RevokeSession(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if current {
		c.cookies.Clear(w)
	}
	httpx.JSON(w, http.StatusOK, models.MessageResponse{Message: "session terminated"})
}
