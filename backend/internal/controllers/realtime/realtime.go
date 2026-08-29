package realtime

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/coder/websocket"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models"
)

type RealtimeHub interface {
	Subscribe(userID, sessionID uuid.UUID, isAdmin bool) (models.RealtimeSubscription, error)
	Unsubscribe(sub models.RealtimeSubscription)
}

type SessionChecker interface {
	EnsureLive(ctx context.Context, userID, sessionID uuid.UUID) error
}

type Controller struct {
	hub      RealtimeHub
	sessions SessionChecker
	origins  []string
	ping     time.Duration
	limiter  shared.Limiter
	limit    int
	window   time.Duration
	now      func() time.Time
}

func NewController(hub RealtimeHub, sessions SessionChecker, origins []string,
	ping time.Duration, limiter shared.Limiter, limit int, window time.Duration) *Controller {
	if ping <= 0 {
		ping = 30 * time.Second
	}
	return &Controller{hub: hub, sessions: sessions, origins: origins, ping: ping,
		limiter: limiter, limit: limit, window: window,
		now: func() time.Time { return time.Now().UTC() }}
}

// @Summary		Realtime channel
// @Description	WebSocket upgrade. The socket is read-only: it carries cache invalidation addresses and
// @Description	event-bus entries, never domain payloads. Data still arrives over the ordinary authorized
// @Description	REST endpoints, so the socket cannot reveal anything a GET would refuse.
// @Description
// @Description	The handshake carries no CSRF header — a WebSocket handshake cannot set one — so Origin is
// @Description	checked explicitly and a mismatch is refused with 403. SameSite=Lax does not cover a
// @Description	WebSocket upgrade: without this check any site a signed-in user visits could open a socket
// @Description	as them.
// @Description
// @Description	The connection is bound to the session rather than to the 15-minute access token, and is
// @Description	closed when the session is revoked, the user signs out or the account is deactivated.
// @Tags			realtime
// @Security		CookieAuth
// @Success		101	{string}	string	"switching protocols"
// @Failure		401	{object}	models.ErrorResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/realtime [get]
func (c *Controller) Connect(w http.ResponseWriter, r *http.Request) {
	if !OriginAllowed(r, c.origins) {
		slog.WarnContext(r.Context(), "realtime handshake refused by origin check",
			"origin", r.Header.Get("Origin"), "request_id", httpx.RequestID(r))
		httpx.Error(w, r, models.NewForbidden("the request origin is not allowed"))
		return
	}
	actor := middleware.ActorFrom(r)
	if actor.IsSystem() {
		httpx.Error(w, r, models.NewUnauthorized("authentication is required"))
		return
	}
	if c.limiter != nil && !c.limiter.Allow("realtime:"+actor.UserID.String(), c.limit, c.window) {
		httpx.Error(w, r, models.NewRateLimited("too many realtime connection attempts, try again later"))
		return
	}
	if err := c.sessions.EnsureLive(r.Context(), actor.UserID, actor.SessionID); err != nil {
		httpx.Error(w, r, err)
		return
	}

	sub, err := c.hub.Subscribe(actor.UserID, actor.SessionID, actor.IsAdmin)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	defer c.hub.Unsubscribe(sub)

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns:  originPatterns(c.origins, r.Host),
		CompressionMode: websocket.CompressionDisabled,
	})
	if err != nil {
		slog.WarnContext(r.Context(), "realtime upgrade failed", "error", err)
		return
	}
	defer func() { _ = conn.CloseNow() }()

	c.pump(r.Context(), conn, sub, actor)
}
