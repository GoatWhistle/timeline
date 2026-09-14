package notification

import (
	"context"
	"crypto/subtle"
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type OpsService interface {
	Ready(ctx context.Context) error
}

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
