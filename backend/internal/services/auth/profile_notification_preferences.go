package auth

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *ProfileService) NotificationPreferences(ctx context.Context, userID uuid.UUID,
) ([]models.NotificationPreference, error) {
	return s.prefs.List(ctx, userID)
}

func (s *ProfileService) SetNotificationPreference(ctx context.Context, actor models.Actor,
	occasion models.NotificationOccasion, channel models.Channel, enabled bool,
) ([]models.NotificationPreference, error) {
	var prefs []models.NotificationPreference
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.prefs.List(ctx, actor.UserID)
		if err != nil {
			return err
		}
		if err := s.prefs.Set(ctx, actor.UserID, occasion, channel, enabled); err != nil {
			return err
		}
		prefs, err = s.prefs.List(ctx, actor.UserID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"notification_preferences": before}, map[string]any{"notification_preferences": prefs})
	})
	if err != nil {
		return nil, err
	}
	return prefs, nil
}

func (s *ProfileService) ReminderSchedule(ctx context.Context, userID uuid.UUID,
) (*models.ReminderSchedule, error) {
	return s.reminders.Get(ctx, userID)
}

func (s *ProfileService) ReplaceReminderSchedule(ctx context.Context, actor models.Actor,
	req dto.UpdateReminderScheduleRequest) (*models.ReminderSchedule, error) {
	schedule, err := reminderScheduleFrom(req)
	if err != nil {
		return nil, err
	}

	var stored *models.ReminderSchedule
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.reminders.Get(ctx, actor.UserID)
		if err != nil {
			return err
		}
		if _, err := s.reminders.Replace(ctx, actor.UserID, schedule); err != nil {
			return err
		}
		stored, err = s.reminders.Get(ctx, actor.UserID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"reminder_schedule": reminderAuditState(before)},
			map[string]any{"reminder_schedule": reminderAuditState(stored)})
	})
	if err != nil {
		return nil, err
	}

	if s.notifier != nil {
		if err := s.notifier.CancelForRecipient(ctx, actor.UserID); err != nil {
			return nil, err
		}
	}
	return stored, nil
}

func reminderAuditState(schedule *models.ReminderSchedule) map[string]any {
	out := make(map[string]any, len(models.ReminderOccasions)+1)
	for _, occasion := range models.ReminderOccasions {
		out[string(occasion)] = schedule.DaysFor(occasion)
	}
	out["overdue_enabled"] = schedule.OverdueEnabled
	return out
}

func reminderScheduleFrom(req dto.UpdateReminderScheduleRequest) (*models.ReminderSchedule, error) {
	schedule := models.NewReminderSchedule()
	schedule.OverdueEnabled = req.OverdueEnabled

	for i, entry := range req.Occasions {
		occasion := models.NotificationOccasion(entry.Occasion)
		if !models.ValidReminderOccasion(occasion) {
			return nil, models.NewValidation("unknown reminder occasion",
				models.FieldError{Field: reminderField(i, "occasion"),
					Message: "allowed values are REMINDER_REGISTRATION_DEADLINE, REMINDER_EVENT_START, " +
						"REMINDER_STAGE_START and REMINDER_EVENT_END"})
		}
		if _, seen := schedule.Days[occasion]; seen {
			return nil, models.NewValidation("the occasion is listed twice",
				models.FieldError{Field: reminderField(i, "occasion"),
					Message: "each occasion may appear at most once"})
		}
		for _, days := range entry.DaysBefore {
			if !models.ValidReminderDay(days) {
				return nil, models.NewValidation("days_before is out of the allowed set",
					models.FieldError{Field: reminderField(i, "days_before"),
						Message: "allowed values are 1, 2, 3, 7 and 14"})
			}
		}
		schedule.Days[occasion] = models.NormalizeReminderDays(entry.DaysBefore)
	}
	return schedule, nil
}

func reminderField(index int, name string) string {
	return "occasions[" + validation.Itoa(index) + "]." + name
}
