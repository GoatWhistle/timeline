package notification

import (
	"context"
	"crypto/subtle"
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpsession"
	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type OpsService interface {
	Ready(ctx context.Context) error
	Heartbeat(ctx context.Context) (*dto.WorkerHeartbeatResponse, error)
	Queue(
		ctx context.Context, actor models.Actor, scope string, page models.Page,
	) ([]dto.QueueEntryResponse, int64, error)
}

type OpsController struct {
	svc          OpsService
	metricsToken string
	metrics      http.Handler
	limiter      httpsession.Limiter
	limit        int
	window       time.Duration
	pageDef      int
	pageMax      int
}

func NewOpsController(svc OpsService, metricsToken string, metrics http.Handler,
	limiter httpsession.Limiter, limit int, window time.Duration, pageDef, pageMax int) *OpsController {
	return &OpsController{svc: svc, metricsToken: metricsToken, metrics: metrics,
		limiter: limiter, limit: limit, window: window, pageDef: pageDef, pageMax: pageMax}
}

// @Summary	Liveness probe
// @Tags		ops
// @Produce	json
// @Success	200	{object}	dto.HealthResponse
// @Router		/healthz [get]
func (c *OpsController) Health(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, dto.HealthResponse{Status: "ok", Time: time.Now().UTC()})
}

// @Summary		Readiness probe
// @Description	Checks that the database is reachable.
// @Tags			ops
// @Produce		json
// @Success		200	{object}	dto.ReadyResponse
// @Failure		503	{object}	dto.ReadyResponse
// @Router			/readyz [get]
func (c *OpsController) Ready(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.Ready(r.Context()); err != nil {
		httpx.JSON(w, http.StatusServiceUnavailable, dto.ReadyResponse{Status: "unavailable", Database: "error"})
		return
	}
	httpx.JSON(w, http.StatusOK, dto.ReadyResponse{Status: "ready", Database: "ok"})
}

// @Summary		Background process status
// @Description	Last run times of the scheduler and worker, queue lengths by status
// @Description	and the age of the oldest pending entry.
// @Tags			ops
// @Produce		json
// @Success		200	{object}	dto.WorkerHeartbeatResponse
// @Failure		503	{object}	dto.WorkerHeartbeatResponse
// @Router			/ops/worker-heartbeat [get]
func (c *OpsController) Heartbeat(w http.ResponseWriter, r *http.Request) {
	hb, err := c.svc.Heartbeat(r.Context())
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	status := http.StatusOK
	if !hb.Healthy {
		status = http.StatusServiceUnavailable
	}
	httpx.JSON(w, status, hb)
}

// @Summary		Prometheus metrics
// @Description	Protected endpoint. Requires an Authorization header with the METRICS_TOKEN bearer token,
// @Description	when the token is set by configuration.
// @Tags			ops
// @Produce		plain
// @Success		200	{string}	string	"metrics in Prometheus format"
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/metrics [get]
func (c *OpsController) Metrics(w http.ResponseWriter, r *http.Request) {
	if c.metricsToken != "" {
		provided := r.Header.Get("Authorization")
		expected := "Bearer " + c.metricsToken
		if subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) != 1 {
			httpx.Error(w, r, models.NewUnauthorized("a metrics access token is required"))
			return
		}
	}
	c.metrics.ServeHTTP(w, r)
}

// @Summary		Queue diagnostics
// @Description	The rows an operator needs to tell a stuck queue apart from a busy one. The heartbeat
// @Description	answers whether something is broken; this answers what exactly.
// @Description
// @Description	scope=failures lists terminal failures — FAILED after the four provider calls of
// @Description	specification section 9.4.8 are spent, and UNDELIVERABLE when no channel was available
// @Description	or every channel closed with a permanent error — each with the reason recorded in
// @Description	last_error, the attempt count and the channels already tried.
// @Description
// @Description	scope=stuck-leases lists entries left in PROCESSING whose worker lease expired. That is
// @Description	the same set the recovery task of section 9.4.9 returns to the queue; this endpoint only
// @Description	reports it and recovers nothing. lease_overdue_seconds says how long the lease has been
// @Description	overdue, which separates a worker that died from one that is merely slow.
// @Description
// @Description	The rows carry no payload_json, no recipient and no registration status: an operations
// @Description	screen is not a way to read other people's notifications or assignments.
// @Tags			ops
// @Produce		json
// @Security		CookieAuth
// @Param			scope		query		string	false	"Rows to return"	Enums(failures,stuck-leases)
// @Param			page		query		int		false	"Page number, from 1"
// @Param			page_size	query		int		false	"Page size"
// @Success		200			{object}	dto.QueueEntryPage
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse
// @Failure		429			{object}	dto.ErrorResponse
// @Router			/ops/queue [get]
func (c *OpsController) Queue(w http.ResponseWriter, r *http.Request) {
	actor := middleware.ActorFrom(r)
	if c.limiter != nil && !c.limiter.Allow("ops-queue:"+actor.UserID.String(), c.limit, c.window) {
		httpx.Error(w, r, models.NewRateLimited("too many queue requests, try again later"))
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.Queue(r.Context(), actor, httpx.QueryTrimmed(r, "scope"), page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.QueueEntryPage{Items: items, Meta: httpx.Meta(page, total)})
}
