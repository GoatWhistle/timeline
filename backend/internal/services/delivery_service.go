package services

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// DeliveryService — worker доставки уведомлений (разделы 9.4 и 10 ТЗ).
// Выбирает готовые записи, повторно проверяет актуальность перед вызовом
// провайдера и ведёт запись по каналам, повторам и конечным статусам.
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

// NewDeliveryService создаёт worker доставки.
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

// Start ведёт три цикла до отмены контекста: опрос очереди, возврат записей
// с истёкшей арендой и очистку по срокам хранения.
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

// runOnce обрабатывает один пакет готовых записей и отмечает живость процесса.
func (s *DeliveryService) runOnce(ctx context.Context) {
	now := s.now()
	if err := s.scheduler.TouchHeartbeat(ctx, "worker", now); err != nil {
		slog.ErrorContext(ctx, "не удалось обновить отметку worker", "error", err)
	}

	claimed, err := s.notifications.ClaimDue(ctx, s.cfg.Notify.WorkerBatch, s.cfg.Notify.LeaseTTL, now)
	if err != nil {
		slog.ErrorContext(ctx, "не удалось выбрать записи очереди", "error", err)
		return
	}
	for i := range claimed {
		if ctx.Err() != nil {
			// Аренда истечёт сама, и запись вернётся в очередь recovery-задачей.
			return
		}
		if err := s.deliver(ctx, &claimed[i]); err != nil {
			slog.ErrorContext(ctx, "обработка уведомления завершилась ошибкой",
				"error", err, "notification_id", claimed[i].ID)
		}
	}
}

// recoverLeases возвращает в очередь записи с истёкшей арендой (AC-NOTIF-08).
func (s *DeliveryService) recoverLeases(ctx context.Context) {
	count, err := s.notifications.RecoverLeases(ctx, s.now())
	if err != nil {
		slog.ErrorContext(ctx, "возврат истёкших аренд завершился ошибкой", "error", err)
		return
	}
	if count > 0 {
		slog.InfoContext(ctx, "истёкшие аренды возвращены в очередь", "count", count)
	}
}

// cleanup применяет сроки хранения снимков уведомлений и журнала аудита.
func (s *DeliveryService) cleanup(ctx context.Context) {
	now := s.now()
	payloads, err := s.notifications.CleanupPayloads(ctx, now.Add(-s.cfg.Retent.NotificationPayload))
	if err != nil {
		slog.ErrorContext(ctx, "очистка снимков уведомлений завершилась ошибкой", "error", err)
	}
	days := int(s.cfg.Retent.AuditLog.Hours() / 24)
	entries, err := s.audit.DeleteOlderThan(ctx, days)
	if err != nil {
		slog.ErrorContext(ctx, "очистка журнала аудита завершилась ошибкой", "error", err)
	}
	if payloads > 0 || entries > 0 {
		slog.InfoContext(ctx, "сроки хранения применены", "payloads", payloads, "audit_entries", entries)
	}
}

// deliver выполняет финальную проверку и попытки доставки одной записи.
// Постоянная ошибка провайдера закрывает канал и переключает попытку на
// следующий доступный канал без задержки; временная уводит запись в повтор.
func (s *DeliveryService) deliver(ctx context.Context, n *models.Notification) error {
	candidate, err := s.scheduler.CandidateByStatus(ctx, n.RegistrationStatusID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return s.notifications.MarkCancelled(ctx, n.ID, "ситуация уведомления больше не актуальна")
		}
		return err
	}
	if reason, ok := staleReason(n, candidate); ok {
		return s.notifications.MarkCancelled(ctx, n.ID, reason)
	}
	if n.Payload == nil {
		// Снимок содержимого удалён по сроку хранения: отправлять нечего,
		// а согласование создаст актуальную запись заново при необходимости.
		return s.notifications.MarkFailed(ctx, n.ID, "снимок содержимого недоступен")
	}

	user, err := s.users.GetByID(ctx, n.RecipientUserID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return s.notifications.MarkCancelled(ctx, n.ID, "получатель недоступен")
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
			return s.notifications.MarkUndeliverable(ctx, n.ID, "доступных каналов доставки не осталось")
		}
		if attempts >= s.cfg.Notify.MaxProviderCalls {
			return s.notifications.MarkFailed(ctx, n.ID, "исчерпан лимит вызовов провайдера")
		}

		started, err := s.notifications.StartProviderCall(ctx, n.ID, channel, s.now())
		if err != nil {
			return err
		}
		if !started {
			// Запись успели отменить до начала вызова провайдера.
			slog.InfoContext(ctx, "уведомление отменено до вызова провайдера", "notification_id", n.ID)
			return nil
		}
		attempts++

		sendErr := s.send(ctx, channel, n, user)
		if sendErr == nil {
			slog.InfoContext(ctx, "уведомление отправлено",
				"notification_id", n.ID, "channel", channel, "attempt", attempts)
			return s.notifications.MarkSent(ctx, n.ID, channel, s.now())
		}

		var delivery *models.DeliveryError
		permanent := errors.As(sendErr, &delivery) && delivery.Permanent
		if permanent {
			// Канал закрыт для этой записи: пробуем следующий в том же проходе.
			if err := s.notifications.AddFailedChannel(ctx, n.ID, channel); err != nil {
				return err
			}
			if err := s.notifications.ResetProviderCall(ctx, n.ID); err != nil {
				return err
			}
			failed = append(failed, channel)
			slog.WarnContext(ctx, "канал закрыт постоянной ошибкой провайдера",
				"notification_id", n.ID, "channel", channel, "error", sendErr)
			continue
		}

		if attempts >= s.cfg.Notify.MaxProviderCalls {
			return s.notifications.MarkFailed(ctx, n.ID, sendErr.Error())
		}
		next := s.now().Add(s.backoff(attempts))
		slog.WarnContext(ctx, "временная ошибка доставки, запись возвращена в очередь",
			"notification_id", n.ID, "channel", channel, "attempt", attempts,
			"next_attempt_at", next, "error", sendErr)
		return s.notifications.MarkRetry(ctx, n.ID, next, sendErr.Error())
	}
}

// send вызывает адаптер выбранного канала.
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
			return models.NewPermanentDeliveryError("привязка Telegram отсутствует", nil)
		}
		msg.Recipient = *user.TelegramChatID
		return s.telegram.Send(ctx, msg)
	case models.ChannelEmail:
		if !user.EmailVerified() {
			return models.NewPermanentDeliveryError("адрес не подтверждён", nil)
		}
		msg.Recipient = user.Email
		return s.email.Send(ctx, msg)
	}
	return models.NewPermanentDeliveryError("неизвестный канал доставки", nil)
}

// channelOverride читает канал, заданный правилом уведомления.
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

// backoff возвращает задержку перед следующей попыткой по числу выполненных
// вызовов провайдера. Список короче лимита попыток продлевается последним шагом.
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

// staleReason сравнивает снимок уведомления с текущей ситуацией. Расхождение
// версий означает, что запись описывает уже неактуальное состояние.
func staleReason(n *models.Notification, c *models.ReconcileCandidate) (string, bool) {
	if n.RecipientUserID != c.RecipientID {
		return "получатель изменился", true
	}
	if n.NotificationContentVersion != c.ContentVersion {
		return "содержимое регистрации изменилось", true
	}
	if n.ScheduleVersion != nil && *n.ScheduleVersion != c.ScheduleVersion {
		return "расписание регистрации изменилось", true
	}
	if n.ActivationVersion != nil && *n.ActivationVersion != c.ActivationVersion {
		return "регистрация переключалась", true
	}
	if n.AssignmentVersion != nil && *n.AssignmentVersion != c.AssignmentVersion {
		return "назначение участника изменилось", true
	}
	if n.TodoCycle != nil && *n.TodoCycle != c.TodoCycle {
		return "цикл статуса изменился", true
	}
	return "", false
}
