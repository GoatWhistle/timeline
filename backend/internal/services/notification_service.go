package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// NotificationService собирает уведомления, логические ключи и снимки содержимого,
// а также отменяет ожидающие записи при изменении доменного состояния.
type NotificationService struct {
	repo *repositories.NotificationRepository
	cfg  *config.Config
	now  func() time.Time
}

// NewNotificationService создаёт сервис уведомлений.
func NewNotificationService(repo *repositories.NotificationRepository, cfg *config.Config) *NotificationService {
	return &NotificationService{repo: repo, cfg: cfg, now: func() time.Time { return time.Now().UTC() }}
}

// PrimaryKey собирает логический ключ первичного уведомления (раздел 9.3 ТЗ).
func PrimaryKey(participantID uuid.UUID, assignmentVersion, activationVersion, contentVersion int) string {
	return fmt.Sprintf("required:%s:av%d:rv%d:cv%d", participantID, assignmentVersion, activationVersion, contentVersion)
}

// RuleKey собирает логический ключ уведомления по правилу. Префикс задаётся типом,
// который, в свою очередь, определяется знаком смещения правила.
func RuleKey(kind models.NotificationType, statusID, ruleID uuid.UUID, scheduleVersion, todoCycle, contentVersion int) string {
	prefix := "reminder"
	if kind == models.NotificationOverdue {
		prefix = "overdue"
	}
	return fmt.Sprintf("%s:%s:%s:sv%d:tc%d:cv%d", prefix, statusID, ruleID, scheduleVersion, todoCycle, contentVersion)
}

// ChooseChannel выбирает канал доставки по правилам раздела 10 ТЗ.
// Недоступный канал отсеивается здесь, до вызова провайдера, и попытку не тратит.
// Каналы из exclude уже закрыты постоянной ошибкой для этого уведомления.
func ChooseChannel(channels models.RecipientChannels, override *models.Channel, exclude []models.Channel) (models.Channel, bool) {
	available := func(ch models.Channel) bool {
		for _, failed := range exclude {
			if failed == ch {
				return false
			}
		}
		return channels.Available(ch)
	}

	if override != nil && available(*override) {
		return *override, true
	}
	if channels.PreferredChannel != nil && available(*channels.PreferredChannel) {
		return *channels.PreferredChannel, true
	}
	for _, ch := range []models.Channel{models.ChannelTelegram, models.ChannelEmail} {
		if available(ch) {
			return ch, true
		}
	}
	return "", false
}

// CreatePrimary создаёт первичное уведомление о необходимости регистрации.
// Возврат false означает, что уведомление для этой ситуации уже существует.
func (s *NotificationService) CreatePrimary(ctx context.Context, c models.ReconcileCandidate) (*models.Notification, bool, error) {
	channel, ok := ChooseChannel(c.RecipientChannels, nil, nil)
	if !ok {
		// Доступного канала нет: запись создаётся, чтобы дедупликация сохранилась,
		// а worker переведёт её в UNDELIVERABLE по общему правилу раздела 10.
		channel = models.ChannelEmail
	}
	now := s.now()
	notification := &models.Notification{
		NotificationType:           models.NotificationRequired,
		RecipientUserID:            c.RecipientID,
		RegistrationStatusID:       c.StatusID,
		AssignmentVersion:          &c.AssignmentVersion,
		ActivationVersion:          &c.ActivationVersion,
		NotificationContentVersion: c.ContentVersion,
		LogicalKey:                 PrimaryKey(c.ParticipantID, c.AssignmentVersion, c.ActivationVersion, c.ContentVersion),
		RequestedChannel:           channel,
		ScheduledAt:                now,
		NextAttemptAt:              &now,
		Payload:                    s.payload(models.NotificationRequired, c),
	}
	return s.repo.Insert(ctx, notification)
}

// CreateForRule создаёт напоминание или уведомление о просрочке по правилу.
func (s *NotificationService) CreateForRule(ctx context.Context, c models.ReconcileCandidate,
	rule models.NotificationRule, scheduledAt time.Time) (*models.Notification, bool, error) {
	kind := rule.NotificationType()
	channel, ok := ChooseChannel(c.RecipientChannels, rule.ChannelOverride, nil)
	if !ok {
		channel = models.ChannelEmail
	}
	now := s.now()
	ruleID := rule.ID
	notification := &models.Notification{
		NotificationType:           kind,
		RecipientUserID:            c.RecipientID,
		RegistrationStatusID:       c.StatusID,
		RuleID:                     &ruleID,
		ScheduleVersion:            &c.ScheduleVersion,
		TodoCycle:                  &c.TodoCycle,
		NotificationContentVersion: c.ContentVersion,
		LogicalKey:                 RuleKey(kind, c.StatusID, rule.ID, c.ScheduleVersion, c.TodoCycle, c.ContentVersion),
		RequestedChannel:           channel,
		ScheduledAt:                scheduledAt,
		NextAttemptAt:              &now,
		Payload:                    s.payload(kind, c),
	}
	return s.repo.Insert(ctx, notification)
}

// payload собирает неизменяемый снимок содержимого уведомления.
// Изменение названия хакатона не меняет уже созданные снимки (AC-NOTIF-12).
func (s *NotificationService) payload(kind models.NotificationType, c models.ReconcileCandidate) *models.NotificationPayload {
	local := c.DeadlineAt.In(s.cfg.App.SystemTZ)
	localText := local.Format("02.01.2006 15:04")
	subject, body := renderTemplate(kind, c.HackathonTitle, c.RegistrationURL, localText, s.cfg.App.SystemTZID)
	return &models.NotificationPayload{
		HackathonTitle:  c.HackathonTitle,
		RegistrationURL: c.RegistrationURL,
		DeadlineUTC:     c.DeadlineAt.UTC(),
		DeadlineLocal:   localText,
		TimezoneID:      s.cfg.App.SystemTZID,
		Type:            string(kind),
		Subject:         subject,
		Body:            body,
	}
}

// renderTemplate формирует текст уведомления. Язык сообщений MVP — русский;
// административные заметки в текст не попадают.
func renderTemplate(kind models.NotificationType, title, url, deadlineLocal, timezone string) (string, string) {
	switch kind {
	case models.NotificationOverdue:
		return fmt.Sprintf("Дедлайн регистрации на хакатон «%s» прошёл", title),
			fmt.Sprintf("Дедлайн регистрации на хакатон «%s» истёк %s (%s), а отметка о регистрации не проставлена.\n\n"+
				"Ссылка на регистрацию: %s\n\n"+
				"Если вы уже зарегистрировались, отметьте это в Hackathon Tracker.",
				title, deadlineLocal, timezone, url)
	case models.NotificationReminder:
		return fmt.Sprintf("Напоминание: регистрация на хакатон «%s»", title),
			fmt.Sprintf("Напоминаем о регистрации на хакатон «%s».\n\n"+
				"Дедлайн: %s (%s)\nСсылка на регистрацию: %s\n\n"+
				"После регистрации отметьте это в Hackathon Tracker, чтобы напоминания прекратились.",
				title, deadlineLocal, timezone, url)
	default:
		return fmt.Sprintf("Требуется регистрация на хакатон «%s»", title),
			fmt.Sprintf("Вы назначены на хакатон «%s». Требуется пройти внешнюю регистрацию.\n\n"+
				"Дедлайн: %s (%s)\nСсылка на регистрацию: %s\n\n"+
				"После регистрации отметьте это в Hackathon Tracker.",
				title, deadlineLocal, timezone, url)
	}
}

// CancelForStatus отменяет ожидающие уведомления статуса регистрации.
func (s *NotificationService) CancelForStatus(ctx context.Context, statusID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{StatusID: &statusID})
	return err
}

// CancelForParticipant отменяет ожидающие уведомления участника.
func (s *NotificationService) CancelForParticipant(ctx context.Context, participantID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{ParticipantID: &participantID})
	return err
}

// CancelForRegistration отменяет ожидающие уведомления регистрации.
func (s *NotificationService) CancelForRegistration(ctx context.Context, registrationID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{RegistrationID: &registrationID})
	return err
}

// CancelForHackathon отменяет ожидающие уведомления хакатона.
func (s *NotificationService) CancelForHackathon(ctx context.Context, hackathonID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{HackathonID: &hackathonID})
	return err
}

// CancelForRecipient отменяет ожидающие уведомления получателя.
func (s *NotificationService) CancelForRecipient(ctx context.Context, userID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{RecipientID: &userID})
	return err
}
