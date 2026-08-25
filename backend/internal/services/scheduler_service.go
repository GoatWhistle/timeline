package services

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// SchedulerService согласовывает очередь уведомлений с текущим состоянием домена.
// Он создаёт отложенные первичные уведомления, напоминания и уведомления
// о просрочке, но никогда не удаляет уже созданные записи.
type SchedulerService struct {
	db        *repositories.DB
	scheduler *repositories.SchedulerRepository
	notifier  *NotificationService
	cfg       *config.Config
	now       func() time.Time
}

// NewSchedulerService создаёт планировщик согласования.
func NewSchedulerService(db *repositories.DB, scheduler *repositories.SchedulerRepository,
	notifier *NotificationService, cfg *config.Config) *SchedulerService {
	return &SchedulerService{db: db, scheduler: scheduler, notifier: notifier, cfg: cfg,
		now: func() time.Time { return time.Now().UTC() }}
}

// ReconcileResult — итог одного прохода согласования.
type ReconcileResult struct {
	Scanned  int
	Primary  int
	Reminder int
	Overdue  int
}

// Run выполняет полный проход согласования по всем кандидатам.
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
		slog.WarnContext(ctx, "не удалось сохранить отметку планировщика", "error", err)
	}
	return result, nil
}

// ReconcileHackathon согласовывает уведомления одного хакатона. Вызывается
// после публикации, изменения дедлайна, правил, ссылки и возврата статуса в TODO.
func (s *SchedulerService) ReconcileHackathon(ctx context.Context, hackathonID uuid.UUID) error {
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
			if c.HackathonID == hackathonID {
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

// processBatch создаёт недостающие уведомления пакета кандидатов.
func (s *SchedulerService) processBatch(ctx context.Context, candidates []models.ReconcileCandidate, result *ReconcileResult) error {
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

// reconcileCandidate создаёт первичное уведомление и уведомления по наступившим
// правилам. Конкурентный планировщик получает конфликт по logical_key, который
// считается успешной идемпотентной обработкой.
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

// ruleApplies проверяет временные границы правила (раздел 9.4 ТЗ).
//
// Правило с неотрицательным смещением не создаёт уведомление после дедлайна:
// напоминать заранее уже поздно. Следствие: правило со смещением 0 срабатывает
// только если согласование пришлось ровно на момент дедлайна — при интервале
// планировщика в 5 минут это редкий случай. Такое поведение прямо предписано ТЗ;
// напоминание о наступившем дедлайне выражается правилом с отрицательным смещением.
func (s *SchedulerService) ruleApplies(rule models.NotificationRule, c models.ReconcileCandidate,
	now time.Time) bool {
	if rule.OffsetMinutes >= 0 {
		return !now.After(c.DeadlineAt)
	}
	// Правило просрочки не создаёт уведомление после окончания хакатона.
	return !now.After(c.HackathonEndAt)
}

// CreateRuleNotification создаёт уведомление по правилу.
func (s *SchedulerService) CreateRuleNotification(ctx context.Context, c models.ReconcileCandidate,
	rule models.NotificationRule, scheduledAt time.Time) (*models.Notification, bool, error) {
	return s.notifier.CreateForRule(ctx, c, rule, scheduledAt)
}

// Start запускает периодическое согласование до отмены контекста.
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
		slog.ErrorContext(ctx, "проход согласования завершился ошибкой", "error", err)
		return
	}
	if result.Primary+result.Reminder+result.Overdue > 0 {
		slog.InfoContext(ctx, "согласование создало уведомления",
			"scanned", result.Scanned, "primary", result.Primary,
			"reminder", result.Reminder, "overdue", result.Overdue)
	}
}
