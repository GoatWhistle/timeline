package reminder

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/personal"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/realtime"
)

type Service struct {
	reminders *personal.Reminders
	events    *realtime.SystemEventService
	limits    config.Personal
	now       func() time.Time
}

func New(reminders *personal.Reminders, events *realtime.SystemEventService,
	limits config.Personal) *Service {
	return &Service{reminders: reminders, events: events, limits: limits,
		now: func() time.Time { return time.Now().UTC() }}
}

type Result struct {
	Tasks          int
	Retrospectives int
}

func (s *Service) Run(ctx context.Context) (*Result, error) {
	result := &Result{}
	if s.events == nil {
		return result, nil
	}
	if err := s.runTasks(ctx, result); err != nil {
		return result, err
	}
	return result, s.runRetrospectives(ctx, result)
}

func (s *Service) runTasks(ctx context.Context, result *Result) error {
	now := s.now()
	until := now.Add(s.limits.TaskReminderLead)
	from := now.Add(-s.limits.TaskReminderGrace)
	cursor := uuid.Nil

	for {
		items, err := s.reminders.DueTasks(ctx, from, until, cursor, s.batch())
		if err != nil {
			return err
		}
		if len(items) == 0 {
			return nil
		}
		for _, item := range items {
			if err := s.emitTask(ctx, item, result); err != nil {
				return err
			}
		}
		cursor = items[len(items)-1].TaskID
		if len(items) < s.batch() {
			return nil
		}
	}
}

func (s *Service) emitTask(ctx context.Context, item models.DueTaskCandidate,
	result *Result) error {
	userID := item.UserID
	taskID := item.TaskID
	stored, err := s.events.Emit(ctx, realtime.EmitRequest{
		Type:        models.EventPersonalTaskDue,
		Severity:    models.SeverityInfo,
		Audience:    models.AudienceUser,
		UserID:      &userID,
		SubjectType: "participant_task",
		SubjectID:   &taskID,
		Payload: map[string]any{
			"task_id":     taskID.String(),
			"event_id":    item.EventID.String(),
			"title":       item.Title,
			"event_title": item.EventTitle,
			"due_at":      item.DueAt.UTC().Format(time.RFC3339),
		},
		DedupKey: taskDueKey(taskID, item.DueAt),
	})
	if err != nil {
		return err
	}
	if stored != nil {
		result.Tasks++
	}
	return nil
}

func (s *Service) runRetrospectives(ctx context.Context, result *Result) error {
	now := s.now()
	until := now.Add(-s.limits.RetrospectiveDelay)
	from := until.Add(-s.limits.RetrospectiveGrace)
	cursorEvent, cursorUser := uuid.Nil, uuid.Nil

	for {
		items, err := s.reminders.DueRetrospectives(ctx, from, until, cursorEvent, cursorUser, s.batch())
		if err != nil {
			return err
		}
		if len(items) == 0 {
			return nil
		}
		for _, item := range items {
			if err := s.emitRetrospective(ctx, item, result); err != nil {
				return err
			}
		}
		last := items[len(items)-1]
		cursorEvent, cursorUser = last.EventID, last.UserID
		if len(items) < s.batch() {
			return nil
		}
	}
}

func (s *Service) emitRetrospective(ctx context.Context,
	item models.DueRetrospectiveCandidate, result *Result) error {
	userID := item.UserID
	eventID := item.EventID
	stored, err := s.events.Emit(ctx, realtime.EmitRequest{
		Type:        models.EventPersonalRetrospectiveDue,
		Severity:    models.SeverityInfo,
		Audience:    models.AudienceUser,
		UserID:      &userID,
		SubjectType: "event",
		SubjectID:   &eventID,
		Payload: map[string]any{
			"event_id":    eventID.String(),
			"event_title": item.EventTitle,
			"end_at":      item.EndAt.UTC().Format(time.RFC3339),
		},
		DedupKey: retrospectiveDueKey(eventID, userID),
	})
	if err != nil {
		return err
	}
	if stored != nil {
		result.Retrospectives++
	}
	return nil
}

func (s *Service) batch() int {
	if s.limits.ReminderBatch <= 0 {
		return 200
	}
	return s.limits.ReminderBatch
}

func taskDueKey(taskID uuid.UUID, dueAt time.Time) string {
	return "task-due:" + taskID.String() + ":" + dueAt.UTC().Format(time.RFC3339)
}

func retrospectiveDueKey(eventID, userID uuid.UUID) string {
	return "retro-due:" + eventID.String() + ":" + userID.String()
}

func (s *Service) Start(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	s.RunOnce(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.RunOnce(ctx)
		}
	}
}

func (s *Service) RunOnce(ctx context.Context) {
	result, err := s.Run(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "personal reminder pass failed", "error", err)
		return
	}
	if result.Tasks+result.Retrospectives > 0 {
		slog.InfoContext(ctx, "personal reminders emitted",
			"tasks", result.Tasks, "retrospectives", result.Retrospectives)
	}
}
