package services

import (
	"context"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type OpsService struct {
	db            *repositories.DB
	scheduler     *repositories.SchedulerRepository
	notifications *repositories.NotificationRepository
	cfg           *config.Config
	now           func() time.Time
}

func NewOpsService(db *repositories.DB, scheduler *repositories.SchedulerRepository,
	notifications *repositories.NotificationRepository, cfg *config.Config) *OpsService {
	return &OpsService{
		db: db, scheduler: scheduler, notifications: notifications, cfg: cfg,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *OpsService) Ready(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return s.db.Ping(ctx)
}

func (s *OpsService) Heartbeat(ctx context.Context) (*models.WorkerHeartbeatResponse, error) {
	now := s.now()

	hb, err := s.scheduler.Heartbeats(ctx)
	if err != nil {
		return nil, err
	}
	stats, err := s.notifications.Stats(ctx, now)
	if err != nil {
		return nil, err
	}

	resp := &models.WorkerHeartbeatResponse{
		SchedulerLastRunAt: hb.Scheduler,
		WorkerLastRunAt:    hb.Worker,
		PendingCount:       stats.Pending,
		ProcessingCount:    stats.Processing,
		FailedCount:        stats.Failed,
		UndeliverableCount: stats.Undeliverable,
		OldestPendingAgeS:  stats.OldestPendingAgeS,
	}
	resp.Healthy = fresh(hb.Scheduler, now, 3*s.cfg.Notify.SchedulerInterval) &&
		fresh(hb.Worker, now, 3*s.cfg.Notify.WorkerInterval) &&
		stats.StuckLeases == 0
	return resp, nil
}

func fresh(at *time.Time, now time.Time, maxAge time.Duration) bool {
	if at == nil {
		return false
	}
	if maxAge < time.Minute {
		maxAge = time.Minute
	}
	return now.Sub(*at) <= maxAge
}
