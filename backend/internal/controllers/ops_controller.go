package controllers

import (
	"crypto/subtle"
	"net/http"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type OpsController struct {
	svc          OpsService
	metricsToken string
	metrics      http.Handler
}

func NewOpsController(svc OpsService, metricsToken string, metrics http.Handler) *OpsController {
	return &OpsController{svc: svc, metricsToken: metricsToken, metrics: metrics}
}

// @Summary	Liveness probe
// @Tags		ops
// @Produce	json
// @Success	200	{object}	models.HealthResponse
// @Router		/healthz [get]
func (c *OpsController) Health(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, models.HealthResponse{Status: "ok", Time: time.Now().UTC()})
}

// @Summary		Readiness probe
// @Description	Checks that the database is reachable.
// @Tags			ops
// @Produce		json
// @Success		200	{object}	models.ReadyResponse
// @Failure		503	{object}	models.ReadyResponse
// @Router			/readyz [get]
func (c *OpsController) Ready(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.Ready(r.Context()); err != nil {
		httpx.JSON(w, http.StatusServiceUnavailable, models.ReadyResponse{Status: "unavailable", Database: "error"})
		return
	}
	httpx.JSON(w, http.StatusOK, models.ReadyResponse{Status: "ready", Database: "ok"})
}

// @Summary		Background process status
// @Description	Last run times of the scheduler and worker, queue lengths by status
// @Description	and the age of the oldest pending entry.
// @Tags			ops
// @Produce		json
// @Success		200	{object}	models.WorkerHeartbeatResponse
// @Failure		503	{object}	models.ErrorResponse
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
// @Failure		401	{object}	models.ErrorResponse
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
