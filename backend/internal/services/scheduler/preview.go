package scheduler

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *SchedulerService) PreviewNotification(ctx context.Context, actor models.Actor,
	statusID uuid.UUID, req dto.NotificationPreviewQuery) (*dto.NotificationPreviewResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}

	kind, daysBefore, err := previewKind(req)
	if err != nil {
		return nil, err
	}

	candidate, err := s.scheduler.CandidateByStatus(ctx, statusID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewNotFound("no notification can be rendered for this registration status")
		}
		return nil, err
	}

	payload := s.notifier.Render(kind, *candidate)
	resp := &dto.NotificationPreviewResponse{
		Type:            kind,
		Language:        payload.Language,
		Subject:         payload.Subject,
		Body:            payload.Body,
		EventTitle:      payload.EventTitle,
		RegistrationURL: payload.RegistrationURL,
		DeadlineUTC:     payload.DeadlineUTC,
		DeadlineLocal:   payload.DeadlineLocal,
		TimezoneID:      payload.TimezoneID,
	}

	if daysBefore != nil {
		resp.DaysBefore = daysBefore
		trigger := models.ReminderTriggerAt(candidate.DeadlineAt, *daysBefore)
		resp.ScheduledAt = &trigger
	}
	if kind == models.NotificationOverdue {
		trigger := candidate.DeadlineAt.Add(s.cfg.Notify.OverdueLead)
		resp.ScheduledAt = &trigger
	}

	channels := candidate.RecipientChannels.Deliverable(kind)
	resp.Channels = channels
	resp.ChannelReady = !channels.Empty()
	return resp, nil
}

func previewKind(req dto.NotificationPreviewQuery) (models.NotificationType, *int, error) {
	if req.Occasion == "" {
		return models.NotificationRequired, nil, nil
	}

	occasion := models.NotificationOccasion(req.Occasion)
	switch occasion {
	case models.NotificationRequired:
		return occasion, nil, nil
	case models.NotificationOverdue:
		return occasion, nil, nil
	case models.NotificationDeadlineReminder:
		if req.DaysBefore == nil {
			return "", nil, models.NewValidation("days_before is required for this occasion",
				models.FieldError{Field: "days_before", Message: "allowed values are 1, 2, 3, 7 and 14"})
		}
		if !models.ValidReminderDay(*req.DaysBefore) {
			return "", nil, models.NewValidation("days_before is out of the allowed set",
				models.FieldError{Field: "days_before", Message: "allowed values are 1, 2, 3, 7 and 14"})
		}
		return occasion, req.DaysBefore, nil
	}
	return "", nil, models.NewValidation("the occasion cannot be rendered for a registration status",
		models.FieldError{Field: "occasion",
			Message: "allowed values are REGISTRATION_REQUIRED, REGISTRATION_OVERDUE and " +
				"REMINDER_REGISTRATION_DEADLINE"})
}
