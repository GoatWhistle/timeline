package delivery

import (
	"context"
	"log/slog"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/realtime"
)

func (s *DeliveryService) WithEvents(events *realtime.SystemEventService) { s.feed = events }

func (s *DeliveryService) WithInbox(inbox InboxCleaner) { s.inbox = inbox }

func (s *DeliveryService) emitTerminal(ctx context.Context, n *models.Notification,
	eventType models.SystemEventType, reason string) {
	if s.feed == nil {
		return
	}
	id := n.ID
	_, err := s.feed.Emit(ctx, realtime.EmitRequest{
		Type:        eventType,
		Severity:    models.SeverityWarning,
		Audience:    models.AudienceAdmin,
		SubjectType: "notification",
		SubjectID:   &id,
		Payload: map[string]any{
			"notification_type": string(n.NotificationType),
			"attempt_count":     n.AttemptCount,
			"reason":            reason,
		},
		DedupKey: string(eventType) + ":" + id.String(),
	})
	if err != nil {
		slog.WarnContext(ctx, "failed to record a delivery failure event", "error", err, "notification_id", id)
	}
}

func (s *DeliveryService) emitMirror(ctx context.Context, n *models.Notification) {
	if s.feed == nil || n.Payload == nil || n.NotificationType.PersonalOccasion() {
		return
	}
	recipient := n.RecipientUserID
	id := n.ID
	_, err := s.feed.Emit(ctx, realtime.EmitRequest{
		Type:        models.EventRegistrationReminder,
		Severity:    models.SeverityInfo,
		Audience:    models.AudienceUser,
		UserID:      &recipient,
		SubjectType: "notification",
		SubjectID:   &id,
		Payload: map[string]any{
			"notification_type": string(n.NotificationType),
			"subject":           n.Payload.Subject,
			"body":              n.Payload.Body,
		},
		DedupKey: "mirror:" + id.String(),
	})
	if err != nil {
		slog.WarnContext(ctx, "failed to record a reminder mirror event", "error", err, "notification_id", id)
	}
}

func (s *DeliveryService) observe(ctx context.Context) {
	if s.feed == nil {
		return
	}
	now := s.now()
	hb, err := s.scheduler.Heartbeats(ctx)
	if err != nil {
		slog.WarnContext(ctx, "failed to read heartbeats for observation", "error", err)
		return
	}
	stats, err := s.notifications.Stats(ctx, now)
	if err != nil {
		slog.WarnContext(ctx, "failed to read queue stats for observation", "error", err)
		return
	}
	healthy := fresh(hb.Scheduler, now, 3*s.cfg.Notify.SchedulerInterval) &&
		fresh(hb.Worker, now, 3*s.cfg.Notify.WorkerInterval) && stats.StuckLeases == 0
	s.feed.Observe(ctx, realtime.HealthObservation{
		WorkerHealthy:   healthy,
		OldestPendingAg: time.Duration(stats.OldestPendingAgeS) * time.Second,
		Threshold:       s.cfg.Realtime.QueueAgeThreshold,
	})
}

func (s *DeliveryService) settleBeforeCall(ctx context.Context, n *models.Notification,
	hasChannel bool, attempts int) (bool, error) {
	if !hasChannel {
		const reason = "no delivery channels remain available"
		if err := s.notifications.MarkUndeliverable(ctx, n.ID, reason); err != nil {
			return true, err
		}
		s.emitTerminal(ctx, n, models.EventNotificationUndeliverable, reason)
		return true, nil
	}
	if attempts >= s.cfg.Notify.MaxProviderCalls {
		const reason = "the provider call limit is exhausted"
		if err := s.notifications.MarkFailed(ctx, n.ID, reason); err != nil {
			return true, err
		}
		s.emitTerminal(ctx, n, models.EventNotificationFailed, reason)
		return true, nil
	}
	return false, nil
}
