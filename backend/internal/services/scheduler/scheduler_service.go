package scheduler

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	svcnotification "github.com/GoatWhistle/timeline/internal/services/notification"
)

type SchedulerService struct {
	db        *postgres.DB
	scheduler *notification.Scheduler
	statuses  *participation.Statuses
	notifier  *svcnotification.NotificationService
	cfg       *config.Config
	now       func() time.Time
}

func NewSchedulerService(db *postgres.DB, scheduler *notification.Scheduler,
	statuses *participation.Statuses, notifier *svcnotification.NotificationService,
	cfg *config.Config) *SchedulerService {
	return &SchedulerService{db: db, scheduler: scheduler, statuses: statuses,
		notifier: notifier, cfg: cfg,
		now: func() time.Time { return time.Now().UTC() }}
}

type ReconcileResult struct {
	Scanned  int
	Primary  int
	Reminder int
	Overdue  int
}

func (s *SchedulerService) ResolveStatusDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.statuses.ResolveDisplayID(ctx, displayID)
}

func (s *SchedulerService) Run(ctx context.Context) (*ReconcileResult, error) {
	result := &ReconcileResult{}
	cursor := uuid.Nil

	for {
		candidates, err := s.scheduler.Candidates(ctx, cursor, s.cfg.Notify.SchedulerBatch)
		if err != nil {
			return result, err
		}
		if len(candidates) == 0 {
			break
		}
		if err := s.processBatch(ctx, candidates, result); err != nil {
			return result, err
		}
		cursor = candidates[len(candidates)-1].StatusID
		if len(candidates) < s.cfg.Notify.SchedulerBatch {
			break
		}
	}

	if err := s.runMoments(ctx, result); err != nil {
		return result, err
	}

	if err := s.scheduler.TouchHeartbeat(ctx, "scheduler", s.now()); err != nil {
		slog.WarnContext(ctx, "failed to store scheduler heartbeat", "error", err)
	}
	return result, nil
}

func (s *SchedulerService) ReconcileEvent(ctx context.Context, eventID uuid.UUID) error {
	result := &ReconcileResult{}
	cursor := uuid.Nil

	for {
		candidates, err := s.scheduler.CandidatesForEvent(ctx, eventID, cursor,
			s.cfg.Notify.SchedulerBatch)
		if err != nil {
			return err
		}
		if len(candidates) == 0 {
			break
		}
		if err := s.processBatch(ctx, candidates, result); err != nil {
			return err
		}
		cursor = candidates[len(candidates)-1].StatusID
		if len(candidates) < s.cfg.Notify.SchedulerBatch {
			break
		}
	}
	return s.reconcileEventMoments(ctx, eventID, result)
}

func (s *SchedulerService) processBatch(ctx context.Context, candidates []models.ReconcileCandidate,
	result *ReconcileResult,
) error {
	if len(candidates) == 0 {
		return nil
	}

	schedules, err := s.schedulesFor(ctx, recipientsOf(candidates))
	if err != nil {
		return err
	}

	now := s.now()
	for _, candidate := range candidates {
		result.Scanned++
		if err := s.reconcileCandidate(ctx, candidate, schedules[candidate.RecipientID], now, result); err != nil {
			return err
		}
	}
	return nil
}

func recipientsOf(candidates []models.ReconcileCandidate) []uuid.UUID {
	ids := make([]uuid.UUID, 0, len(candidates))
	seen := make(map[uuid.UUID]struct{}, len(candidates))
	for _, c := range candidates {
		if _, ok := seen[c.RecipientID]; !ok {
			seen[c.RecipientID] = struct{}{}
			ids = append(ids, c.RecipientID)
		}
	}
	return ids
}

func (s *SchedulerService) schedulesFor(ctx context.Context, userIDs []uuid.UUID,
) (map[uuid.UUID]*models.ReminderSchedule, error) {
	return s.scheduler.Schedules(ctx, userIDs)
}

func (s *SchedulerService) reconcileCandidate(ctx context.Context, c models.ReconcileCandidate,
	schedule *models.ReminderSchedule, now time.Time, result *ReconcileResult) error {
	created, err := s.notifier.CreatePrimary(ctx, c)
	if err != nil {
		return err
	}
	result.Primary += created

	if schedule == nil {
		return nil
	}

	for _, days := range schedule.DaysFor(models.NotificationDeadlineReminder) {
		trigger := models.ReminderTriggerAt(c.DeadlineAt, days)
		if now.Before(trigger) || now.After(c.DeadlineAt) {
			continue
		}
		created, err := s.notifier.CreateDeadlineReminder(ctx, c, days, schedule.Version, trigger)
		if err != nil {
			return err
		}
		result.Reminder += created
	}

	if schedule.OverdueEnabled {
		trigger := c.DeadlineAt.Add(s.cfg.Notify.OverdueLead)
		if !now.Before(trigger) && !now.After(c.EventEndAt) {
			created, err := s.notifier.CreateOverdue(ctx, c, schedule.Version, trigger)
			if err != nil {
				return err
			}
			result.Overdue += created
		}
	}
	return nil
}

func (s *SchedulerService) Start(ctx context.Context) {
	ticker := time.NewTicker(s.cfg.Notify.SchedulerInterval)
	defer ticker.Stop()

	s.runOnce(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.runOnce(ctx)
		}
	}
}

func (s *SchedulerService) runOnce(ctx context.Context) {
	result, err := s.Run(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "reconciliation pass failed", "error", err)
		return
	}
	if result.Primary+result.Reminder+result.Overdue > 0 {
		slog.InfoContext(ctx, "reconciliation created notifications",
			"scanned", result.Scanned, "primary", result.Primary,
			"reminder", result.Reminder, "overdue", result.Overdue)
	}
}
