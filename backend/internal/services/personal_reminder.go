package services

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/personal"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

type PersonalReminderService struct {
	reminders *personal.Reminders
	events    *SystemEventService
	limits    config.Personal
	now       func() time.Time
}

func NewPersonalReminderService(reminders *personal.Reminders, events *SystemEventService,
	limits config.Personal) *PersonalReminderService {
	return &PersonalReminderService{reminders: reminders, events: events, limits: limits,
		now: func() time.Time { return time.Now().UTC() }}
}

type ReminderResult struct {
	Tasks          int
	Retrospectives int
}

func (s *PersonalReminderService) Run(ctx context.Context) (*ReminderResult, error) {
	result := &ReminderResult{}
	if s.events == nil {
		return result, nil
	}
	if err := s.runTasks(ctx, result); err != nil {
		return result, err
	}
	return result, s.runRetrospectives(ctx, result)
}

func (s *PersonalReminderService) runTasks(ctx context.Context, result *ReminderResult) error {
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

func (s *PersonalReminderService) emitTask(ctx context.Context, item models.DueTaskCandidate,
	result *ReminderResult) error {
	userID := item.UserID
	taskID := item.TaskID
	stored, err := s.events.Emit(ctx, EmitRequest{
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

func (s *PersonalReminderService) runRetrospectives(ctx context.Context, result *ReminderResult) error {
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

func (s *PersonalReminderService) emitRetrospective(ctx context.Context,
	item models.DueRetrospectiveCandidate, result *ReminderResult) error {
	userID := item.UserID
	eventID := item.EventID
	stored, err := s.events.Emit(ctx, EmitRequest{
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

func (s *PersonalReminderService) batch() int {
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

func (s *PersonalReminderService) Start(ctx context.Context, interval time.Duration) {
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

func (s *PersonalReminderService) RunOnce(ctx context.Context) {
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
