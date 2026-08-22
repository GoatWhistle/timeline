package controllers

import (
	"crypto/subtle"
	"net/http"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// OpsController обслуживает служебные проверки и метрики.
type OpsController struct {
	svc          OpsService
	metricsToken string
	metrics      http.Handler
}

// NewOpsController создаёт служебный контроллер.
func NewOpsController(svc OpsService, metricsToken string, metrics http.Handler) *OpsController {
	return &OpsController{svc: svc, metricsToken: metricsToken, metrics: metrics}
}

// Health godoc
//
//	@Summary	Проверка живости
//	@Tags		ops
//	@Produce	json
//	@Success	200	{object}	models.HealthResponse
//	@Router		/healthz [get]
func (c *OpsController) Health(w http.ResponseWriter, r *http.Request) {
	httpx.JSON(w, http.StatusOK, models.HealthResponse{Status: "ok", Time: time.Now().UTC()})
}

// Ready godoc
//
//	@Summary		Проверка готовности
//	@Description	Проверяет доступность базы данных.
//	@Tags			ops
//	@Produce		json
//	@Success		200	{object}	models.ReadyResponse
//	@Failure		503	{object}	models.ReadyResponse
//	@Router			/readyz [get]
func (c *OpsController) Ready(w http.ResponseWriter, r *http.Request) {
	if err := c.svc.Ready(r.Context()); err != nil {
		httpx.JSON(w, http.StatusServiceUnavailable, models.ReadyResponse{Status: "unavailable", Database: "error"})
		return
	}
	httpx.JSON(w, http.StatusOK, models.ReadyResponse{Status: "ready", Database: "ok"})
}

// Heartbeat godoc
//
//	@Summary		Состояние фоновых процессов
//	@Description	Время последних запусков планировщика и worker, длины очереди по статусам
//	@Description	и возраст самой старой ожидающей записи.
//	@Tags			ops
//	@Produce		json
//	@Success		200	{object}	models.WorkerHeartbeatResponse
//	@Failure		503	{object}	models.ErrorResponse
//	@Router			/ops/worker-heartbeat [get]
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

// Metrics godoc
//
//	@Summary		Метрики Prometheus
//	@Description	Защищённый endpoint. Требует заголовок Authorization с bearer-токеном METRICS_TOKEN,
//	@Description	если токен задан конфигурацией.
//	@Tags			ops
//	@Produce		plain
//	@Success		200	{string}	string	"метрики в формате Prometheus"
//	@Failure		401	{object}	models.ErrorResponse
//	@Router			/metrics [get]
func (c *OpsController) Metrics(w http.ResponseWriter, r *http.Request) {
	if c.metricsToken != "" {
		provided := r.Header.Get("Authorization")
		expected := "Bearer " + c.metricsToken
		if subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) != 1 {
			httpx.Error(w, r, models.NewUnauthorized("требуется токен доступа к метрикам"))
			return
		}
	}
	c.metrics.ServeHTTP(w, r)
}
