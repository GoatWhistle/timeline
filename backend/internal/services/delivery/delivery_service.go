package delivery

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	svcnotification "github.com/GoatWhistle/timeline/internal/services/notification"
	"github.com/GoatWhistle/timeline/internal/services/realtime"
	"github.com/GoatWhistle/timeline/internal/services/shared/mail"
)

type DeliveryService struct {
	db            *postgres.DB
	notifications *notification.Notifications
	scheduler     *notification.Scheduler
	users         *identity.Users
	rules         *participation.Rules
	audit         *audit.Audit
	telegram      mail.TelegramSender
	email         mail.EmailSender
	events        *realtime.SystemEventService
	cfg           *config.Config
	now           func() time.Time
}

func NewDeliveryService(db *postgres.DB, notifications *notification.Notifications,
	scheduler *notification.Scheduler, users *identity.Users,
	rules *participation.Rules, audit *audit.Audit,
	telegram mail.TelegramSender, email mail.EmailSender, cfg *config.Config) *DeliveryService {
	return &DeliveryService{
		db:            db,
		notifications: notifications, scheduler: scheduler, users: users, rules: rules, audit: audit,
		telegram: telegram, email: email, cfg: cfg,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *DeliveryService) resolveCandidate(ctx context.Context,
	n *models.Notification) (*models.ReconcileCandidate, bool, error) {
	candidate, err := s.scheduler.CandidateByStatus(ctx, n.RegistrationStatusID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, true,
				s.notifications.MarkCancelled(ctx, n.ID, "the notification situation is no longer relevant")
		}
		return nil, true, err
	}
	if reason, ok := staleReason(n, candidate); ok {
		return nil, true, s.notifications.MarkCancelled(ctx, n.ID, reason)
	}
	if n.Payload == nil {
		return nil, true, s.notifications.MarkFailed(ctx, n.ID, "the content snapshot is unavailable")
	}
	return candidate, false, nil
}

func (s *DeliveryService) resolveRecipient(ctx context.Context,
	n *models.Notification) (*models.User, bool, error) {
	user, err := s.users.GetByID(ctx, n.RecipientUserID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, true, s.notifications.MarkCancelled(ctx, n.ID, "the recipient is unavailable")
		}
		return nil, true, err
	}
	return user, false, nil
}

func (s *DeliveryService) handleSendError(ctx context.Context, n *models.Notification,
	channel models.Channel, attempts int, sendErr error) (bool, error) {
	var delivery *models.DeliveryError
	if errors.As(sendErr, &delivery) && delivery.Permanent {
		if err := s.notifications.AddFailedChannel(ctx, n.ID, channel); err != nil {
			return false, err
		}
		if err := s.notifications.ResetProviderCall(ctx, n.ID); err != nil {
			return false, err
		}
		slog.WarnContext(ctx, "channel closed by permanent provider error",
			"notification_id", n.ID, "channel", channel, "error", sendErr)
		return true, nil
	}

	if attempts >= s.cfg.Notify.MaxProviderCalls {
		if err := s.notifications.MarkFailed(ctx, n.ID, sendErr.Error()); err != nil {
			return false, err
		}
		s.emitTerminal(ctx, n, models.EventNotificationFailed, sendErr.Error())
		return false, nil
	}
	next := s.now().Add(s.backoff(attempts))
	slog.WarnContext(ctx, "temporary delivery error, entry returned to queue",
		"notification_id", n.ID, "channel", channel, "attempt", attempts,
		"next_attempt_at", next, "error", sendErr)
	return false, s.notifications.MarkRetry(ctx, n.ID, next, sendErr.Error())
}

func (s *DeliveryService) deliver(ctx context.Context, n *models.Notification) error {
	candidate, settled, err := s.resolveCandidate(ctx, n)
	if err != nil || settled {
		return err
	}

	user, settled, err := s.resolveRecipient(ctx, n)
	if err != nil || settled {
		return err
	}

	override, err := s.channelOverride(ctx, n)
	if err != nil {
		return err
	}

	failed := append([]models.Channel(nil), n.FailedChannels...)
	attempts := n.AttemptCount
	for {
		channel, ok := svcnotification.ChooseChannel(candidate.RecipientChannels, override, failed)
		if settled, err := s.settleBeforeCall(ctx, n, ok, attempts); settled || err != nil {
			return err
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
			if err := s.notifications.MarkSent(ctx, n.ID, channel, s.now()); err != nil {
				return err
			}
			s.emitMirror(ctx, n)
			return nil
		}

		retryChannel, err := s.handleSendError(ctx, n, channel, attempts, sendErr)
		if err != nil || !retryChannel {
			return err
		}
		failed = append(failed, channel)
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
