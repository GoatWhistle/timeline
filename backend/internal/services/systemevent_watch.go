package services

import (
	"context"
	"log/slog"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

const (
	stateHealthy = "healthy"
	stateStalled = "stalled"
	stateHigh    = "high"
	stateNormal  = "normal"

	subjectWorker   = "worker:health"
	subjectQueueAge = "queue:age"
)

type HealthObservation struct {
	WorkerHealthy   bool
	OldestPendingAg time.Duration
	Threshold       time.Duration
}

func (s *SystemEventService) Observe(ctx context.Context, obs HealthObservation) {
	s.observeWorker(ctx, obs.WorkerHealthy)
	s.observeQueueAge(ctx, obs.OldestPendingAg, obs.Threshold)
}

func (s *SystemEventService) observeWorker(ctx context.Context, healthy bool) {
	state := stateStalled
	req := EmitRequest{
		Type:     models.EventWorkerStalled,
		Severity: models.SeverityCritical,
		Audience: models.AudienceAdmin,
		Payload:  map[string]any{"state": state},
	}
	if healthy {
		state = stateHealthy
		req.Type = models.EventWorkerRecovered
		req.Severity = models.SeverityInfo
		req.Payload = map[string]any{"state": state}
	}
	if _, err := s.EmitOnTransition(ctx, subjectWorker, state, req); err != nil {
		slog.WarnContext(ctx, "failed to record a worker health event", "error", err)
	}
}

func (s *SystemEventService) observeQueueAge(ctx context.Context, age, threshold time.Duration) {
	if threshold <= 0 {
		return
	}
	state := stateNormal
	req := EmitRequest{
		Type:     models.EventQueueAgeNormal,
		Severity: models.SeverityInfo,
		Audience: models.AudienceAdmin,
	}
	if age > threshold {
		state = stateHigh
		req.Type = models.EventQueueAgeHigh
		req.Severity = models.SeverityWarning
	}
	req.Payload = map[string]any{
		"state":                state,
		"oldest_pending_age_s": int64(age.Seconds()),
		"threshold_s":          int64(threshold.Seconds()),
	}
	if _, err := s.EmitOnTransition(ctx, subjectQueueAge, state, req); err != nil {
		slog.WarnContext(ctx, "failed to record a queue age event", "error", err)
	}
}
