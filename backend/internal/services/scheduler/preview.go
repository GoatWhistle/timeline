package scheduler

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *SchedulerService) PreviewNotification(ctx context.Context, actor models.Actor,
	statusID uuid.UUID, ruleID *uuid.UUID) (*dto.NotificationPreviewResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}

	candidate, err := s.scheduler.CandidateByStatus(ctx, statusID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewNotFound("no notification can be rendered for this registration status")
		}
		return nil, err
	}

	rule, err := s.previewRule(ctx, candidate, ruleID)
	if err != nil {
		return nil, err
	}

	kind := models.NotificationRequired
	if rule != nil {
		kind = rule.NotificationType()
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

	if rule != nil {
		id := rule.DisplayID
		resp.RuleID = &id
		trigger := rule.TriggerAt(candidate.DeadlineAt)
		resp.ScheduledAt = &trigger
	}
	channels := candidate.RecipientChannels.Deliverable(kind)
	resp.Channels = channels
	resp.ChannelReady = !channels.Empty()
	return resp, nil
}

func (s *SchedulerService) previewRule(ctx context.Context, candidate *models.ReconcileCandidate,
	ruleID *uuid.UUID) (*models.NotificationRule, error) {
	if ruleID == nil {
		return nil, nil
	}
	rule, err := s.rules.GetByID(ctx, *ruleID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewNotFound("reminder rule not found")
		}
		return nil, err
	}
	if rule.RegistrationID != candidate.RegistrationID {
		return nil, models.NewNotFound("reminder rule not found")
	}
	return rule, nil
}
