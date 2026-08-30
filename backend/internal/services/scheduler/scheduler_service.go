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
	rules     *participation.Rules
	statuses  *participation.Statuses
	notifier  *svcnotification.NotificationService
	cfg       *config.Config
	now       func() time.Time
}

func NewSchedulerService(db *postgres.DB, scheduler *notification.Scheduler,
	rules *participation.Rules, statuses *participation.Statuses,
	notifier *svcnotification.NotificationService, cfg *config.Config) *SchedulerService {
	return &SchedulerService{db: db, scheduler: scheduler, rules: rules, statuses: statuses,
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

func (s *SchedulerService) ResolveRuleDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.rules.ResolveDisplayID(ctx, displayID)
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

	if err := s.scheduler.TouchHeartbeat(ctx, "scheduler", s.now()); err != nil {
		slog.WarnContext(ctx, "failed to store scheduler heartbeat", "error", err)
	}
	return result, nil
}

func (s *SchedulerService) ReconcileEvent(ctx context.Context, eventID uuid.UUID) error {
	result := &ReconcileResult{}
	cursor := uuid.Nil

	for {
		candidates, err := s.scheduler.Candidates(ctx, cursor, s.cfg.Notify.SchedulerBatch)
		if err != nil {
			return err
		}
		if len(candidates) == 0 {
			return nil
		}
		filtered := make([]models.ReconcileCandidate, 0, len(candidates))
		for _, c := range candidates {
			if c.EventID == eventID {
				filtered = append(filtered, c)
			}
		}
		if err := s.processBatch(ctx, filtered, result); err != nil {
			return err
		}
		cursor = candidates[len(candidates)-1].StatusID
		if len(candidates) < s.cfg.Notify.SchedulerBatch {
			return nil
		}
	}
}

func (s *SchedulerService) processBatch(ctx context.Context, candidates []models.ReconcileCandidate,
	result *ReconcileResult,
) error {
	if len(candidates) == 0 {
		return nil
	}

	registrationIDs := make([]uuid.UUID, 0, len(candidates))
	seen := make(map[uuid.UUID]struct{}, len(candidates))
	for _, c := range candidates {
		if _, ok := seen[c.RegistrationID]; !ok {
			seen[c.RegistrationID] = struct{}{}
			registrationIDs = append(registrationIDs, c.RegistrationID)
		}
	}
	rules, err := s.scheduler.EnabledRules(ctx, registrationIDs)
	if err != nil {
		return err
	}

	now := s.now()
	for _, candidate := range candidates {
		result.Scanned++
		if err := s.reconcileCandidate(ctx, candidate, rules[candidate.RegistrationID], now, result); err != nil {
			return err
		}
	}
	return nil
}

func (s *SchedulerService) reconcileCandidate(ctx context.Context, c models.ReconcileCandidate,
	rules []models.NotificationRule, now time.Time, result *ReconcileResult) error {
	if _, created, err := s.notifier.CreatePrimary(ctx, c); err != nil {
		return err
	} else if created {
		result.Primary++
	}

	for _, rule := range rules {
		trigger := rule.TriggerAt(c.DeadlineAt)
		if now.Before(trigger) {
			continue
		}
		if !s.ruleApplies(rule, c, now) {
			continue
		}
		_, created, err := s.CreateRuleNotification(ctx, c, rule, trigger)
		if err != nil {
			return err
		}
		if !created {
			continue
		}
		if rule.NotificationType() == models.NotificationOverdue {
			result.Overdue++
		} else {
			result.Reminder++
		}
	}
	return nil
}

func (s *SchedulerService) ruleApplies(rule models.NotificationRule, c models.ReconcileCandidate,
	now time.Time) bool {
	if rule.OffsetMinutes >= 0 {
		return !now.After(c.DeadlineAt)
	}
	return !now.After(c.EventEndAt)
}

func (s *SchedulerService) CreateRuleNotification(ctx context.Context, c models.ReconcileCandidate,
	rule models.NotificationRule, scheduledAt time.Time) (*models.Notification, bool, error) {
	return s.notifier.CreateForRule(ctx, c, rule, scheduledAt)
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
