package services

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/repositories"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

type DeliveryService struct {
	notifications *repositories.NotificationRepository
	scheduler     *repositories.SchedulerRepository
	users         *repositories.UserRepository
	rules         *repositories.RuleRepository
	audit         *repositories.AuditRepository
	telegram      TelegramSender
	email         EmailSender
	cfg           *config.Config
	now           func() time.Time
}

func NewDeliveryService(notifications *repositories.NotificationRepository,
	scheduler *repositories.SchedulerRepository, users *repositories.UserRepository,
	rules *repositories.RuleRepository, audit *repositories.AuditRepository,
	telegram TelegramSender, email EmailSender, cfg *config.Config) *DeliveryService {
	return &DeliveryService{
		notifications: notifications, scheduler: scheduler, users: users, rules: rules, audit: audit,
		telegram: telegram, email: email, cfg: cfg,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *DeliveryService) Start(ctx context.Context) {
	poll := time.NewTicker(s.cfg.Notify.WorkerInterval)
	defer poll.Stop()
	recovery := time.NewTicker(s.cfg.Notify.RecoveryInterval)
	defer recovery.Stop()
	retention := time.NewTicker(s.cfg.Retent.Interval)
	defer retention.Stop()

	s.runOnce(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-poll.C:
			s.runOnce(ctx)
		case <-recovery.C:
			s.recoverLeases(ctx)
		case <-retention.C:
			s.cleanup(ctx)
		}
	}
}

func (s *DeliveryService) runOnce(ctx context.Context) {
	now := s.now()
	if err := s.scheduler.TouchHeartbeat(ctx, "worker", now); err != nil {
		slog.ErrorContext(ctx, "failed to update worker heartbeat", "error", err)
	}

	claimed, err := s.notifications.ClaimDue(ctx, s.cfg.Notify.WorkerBatch, s.cfg.Notify.LeaseTTL, now)
	if err != nil {
		slog.ErrorContext(ctx, "failed to claim queue entries", "error", err)
		return
	}
	for i := range claimed {
		if ctx.Err() != nil {
			return
		}
		if err := s.deliver(ctx, &claimed[i]); err != nil {
			slog.ErrorContext(ctx, "notification processing failed",
				"error", err, "notification_id", claimed[i].ID)
		}
	}
}

func (s *DeliveryService) recoverLeases(ctx context.Context) {
	count, err := s.notifications.RecoverLeases(ctx, s.now())
	if err != nil {
		slog.ErrorContext(ctx, "releasing expired leases failed", "error", err)
		return
	}
	if count > 0 {
		slog.InfoContext(ctx, "expired leases returned to queue", "count", count)
	}
}

func (s *DeliveryService) cleanup(ctx context.Context) {
	now := s.now()
	payloads, err := s.notifications.CleanupPayloads(ctx, now.Add(-s.cfg.Retent.NotificationPayload))
	if err != nil {
		slog.ErrorContext(ctx, "notification payload cleanup failed", "error", err)
	}
	days := int(s.cfg.Retent.AuditLog.Hours() / 24)
	entries, err := s.audit.DeleteOlderThan(ctx, days)
	if err != nil {
		slog.ErrorContext(ctx, "audit log cleanup failed", "error", err)
	}
	if payloads > 0 || entries > 0 {
		slog.InfoContext(ctx, "retention policy applied", "payloads", payloads, "audit_entries", entries)
	}
}

func (s *DeliveryService) deliver(ctx context.Context, n *models.Notification) error {
	candidate, err := s.scheduler.CandidateByStatus(ctx, n.RegistrationStatusID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return s.notifications.MarkCancelled(ctx, n.ID, "the notification situation is no longer relevant")
		}
		return err
	}
	if reason, ok := staleReason(n, candidate); ok {
		return s.notifications.MarkCancelled(ctx, n.ID, reason)
	}
	if n.Payload == nil {
		return s.notifications.MarkFailed(ctx, n.ID, "the content snapshot is unavailable")
	}

	user, err := s.users.GetByID(ctx, n.RecipientUserID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return s.notifications.MarkCancelled(ctx, n.ID, "the recipient is unavailable")
		}
		return err
	}

	override, err := s.channelOverride(ctx, n)
	if err != nil {
		return err
	}

	failed := append([]models.Channel(nil), n.FailedChannels...)
	attempts := n.AttemptCount
	for {
		channel, ok := ChooseChannel(candidate.RecipientChannels, override, failed)
		if !ok {
			return s.notifications.MarkUndeliverable(ctx, n.ID, "no delivery channels remain available")
		}
		if attempts >= s.cfg.Notify.MaxProviderCalls {
			return s.notifications.MarkFailed(ctx, n.ID, "the provider call limit is exhausted")
		}

		started, err := s.notifications.StartProviderCall(ctx, n.ID, channel, s.now())
		if err != nil {
			return err
		}
		if !started {
			slog.InfoContext(ctx, "notification cancelled before provider call", "notification_id", n.ID)
			return nil
		}
		attempts++

		sendErr := s.send(ctx, channel, n, user)
		if sendErr == nil {
			slog.InfoContext(ctx, "notification sent",
				"notification_id", n.ID, "channel", channel, "attempt", attempts)
			return s.notifications.MarkSent(ctx, n.ID, channel, s.now())
		}

		var delivery *models.DeliveryError
		permanent := errors.As(sendErr, &delivery) && delivery.Permanent
		if permanent {
			if err := s.notifications.AddFailedChannel(ctx, n.ID, channel); err != nil {
				return err
			}
			if err := s.notifications.ResetProviderCall(ctx, n.ID); err != nil {
				return err
			}
			failed = append(failed, channel)
			slog.WarnContext(ctx, "channel closed by permanent provider error",
				"notification_id", n.ID, "channel", channel, "error", sendErr)
			continue
		}

		if attempts >= s.cfg.Notify.MaxProviderCalls {
			return s.notifications.MarkFailed(ctx, n.ID, sendErr.Error())
		}
		next := s.now().Add(s.backoff(attempts))
		slog.WarnContext(ctx, "temporary delivery error, entry returned to queue",
			"notification_id", n.ID, "channel", channel, "attempt", attempts,
			"next_attempt_at", next, "error", sendErr)
		return s.notifications.MarkRetry(ctx, n.ID, next, sendErr.Error())
	}
}

func (s *DeliveryService) send(ctx context.Context, channel models.Channel,
	n *models.Notification, user *models.User) error {
	msg := models.OutboundMessage{
		IdempotencyKey: n.ID.String(),
		Subject:        n.Payload.Subject,
		Body:           n.Payload.Body,
	}
	switch channel {
	case models.ChannelTelegram:
		if !user.TelegramLinked() {
			return models.NewPermanentDeliveryError("no Telegram link is present", nil)
		}
		msg.Recipient = *user.TelegramChatID
		return s.telegram.Send(ctx, msg)
	case models.ChannelEmail:
		if !user.EmailVerified() {
			return models.NewPermanentDeliveryError("the address is not confirmed", nil)
		}
		msg.Recipient = user.Email
		return s.email.Send(ctx, msg)
	}
	return models.NewPermanentDeliveryError("unknown delivery channel", nil)
}

func (s *DeliveryService) channelOverride(ctx context.Context, n *models.Notification) (*models.Channel, error) {
	if n.RuleID == nil {
		return nil, nil
	}
	rule, err := s.rules.GetByID(ctx, *n.RuleID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return rule.ChannelOverride, nil
}

func (s *DeliveryService) backoff(attempts int) time.Duration {
	steps := s.cfg.Notify.Backoff
	if len(steps) == 0 {
		return time.Minute
	}
	idx := attempts - 1
	if idx < 0 {
		idx = 0
	}
	if idx >= len(steps) {
		idx = len(steps) - 1
	}
	return steps[idx]
}

func staleReason(n *models.Notification, c *models.ReconcileCandidate) (string, bool) {
	if n.RecipientUserID != c.RecipientID {
		return "the recipient changed", true
	}
	if n.NotificationContentVersion != c.ContentVersion {
		return "the registration content changed", true
	}
	if n.ScheduleVersion != nil && *n.ScheduleVersion != c.ScheduleVersion {
		return "the registration schedule changed", true
	}
	if n.ActivationVersion != nil && *n.ActivationVersion != c.ActivationVersion {
		return "the registration was toggled", true
	}
	if n.AssignmentVersion != nil && *n.AssignmentVersion != c.AssignmentVersion {
		return "the participant assignment changed", true
	}
	if n.TodoCycle != nil && *n.TodoCycle != c.TodoCycle {
		return "the status cycle changed", true
	}
	return "", false
}
