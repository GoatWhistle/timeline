package scheduler

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *SchedulerService) runMoments(ctx context.Context, result *ReconcileResult) error {
	cursor := uuid.Nil
	for {
		candidates, err := s.scheduler.MomentCandidates(ctx, s.now(), cursor,
			s.cfg.Notify.SchedulerBatch)
		if err != nil {
			return err
		}
		if len(candidates) == 0 {
			return nil
		}
		if err := s.processMoments(ctx, candidates, result); err != nil {
			return err
		}

		last := candidates[len(candidates)-1].RecipientID
		if last == cursor {
			return nil
		}
		cursor = last
	}
}

func (s *SchedulerService) reconcileEventMoments(ctx context.Context, eventID uuid.UUID,
	result *ReconcileResult) error {
	candidates, err := s.scheduler.MomentCandidatesForEvent(ctx, eventID, s.now(),
		s.cfg.Notify.SchedulerBatch)
	if err != nil {
		return err
	}
	return s.processMoments(ctx, candidates, result)
}

func (s *SchedulerService) processMoments(ctx context.Context, candidates []models.MomentCandidate,
	result *ReconcileResult) error {
	if len(candidates) == 0 {
		return nil
	}

	ids := make([]uuid.UUID, 0, len(candidates))
	seen := make(map[uuid.UUID]struct{}, len(candidates))
	for _, c := range candidates {
		if _, ok := seen[c.RecipientID]; !ok {
			seen[c.RecipientID] = struct{}{}
			ids = append(ids, c.RecipientID)
		}
	}
	schedules, err := s.schedulesFor(ctx, ids)
	if err != nil {
		return err
	}

	now := s.now()
	for _, candidate := range candidates {
		result.Scanned++
		if err := s.reconcileMoment(ctx, candidate, schedules[candidate.RecipientID], now,
			result); err != nil {
			return err
		}
	}
	return nil
}

func (s *SchedulerService) reconcileMoment(ctx context.Context, c models.MomentCandidate,
	schedule *models.ReminderSchedule, now time.Time, result *ReconcileResult) error {
	if schedule == nil {
		return nil
	}
	for _, days := range schedule.DaysFor(c.Occasion) {
		trigger := models.ReminderTriggerAt(c.MomentAt, days)
		if now.Before(trigger) || now.After(c.MomentAt) {
			continue
		}
		created, err := s.notifier.CreateMomentReminder(ctx, c, days, schedule.Version, trigger)
		if err != nil {
			return err
		}
		result.Reminder += created
	}
	return nil
}
