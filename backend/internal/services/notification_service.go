package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/repositories"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

type NotificationService struct {
	repo *repositories.NotificationRepository
	cfg  *config.Config
	now  func() time.Time
}

func NewNotificationService(repo *repositories.NotificationRepository, cfg *config.Config) *NotificationService {
	return &NotificationService{repo: repo, cfg: cfg, now: func() time.Time { return time.Now().UTC() }}
}

func PrimaryKey(participantID uuid.UUID, assignmentVersion, activationVersion, contentVersion int) string {
	return fmt.Sprintf("required:%s:av%d:rv%d:cv%d", participantID, assignmentVersion, activationVersion, contentVersion)
}

func RuleKey(kind models.NotificationType, statusID, ruleID uuid.UUID, scheduleVersion, todoCycle, contentVersion int) string {
	prefix := "reminder"
	if kind == models.NotificationOverdue {
		prefix = "overdue"
	}
	return fmt.Sprintf("%s:%s:%s:sv%d:tc%d:cv%d", prefix, statusID, ruleID, scheduleVersion, todoCycle, contentVersion)
}

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

func (s *NotificationService) CreatePrimary(ctx context.Context, c models.ReconcileCandidate) (*models.Notification, bool, error) {
	channel, ok := ChooseChannel(c.RecipientChannels, nil, nil)
	if !ok {
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

func (s *NotificationService) payload(kind models.NotificationType, c models.ReconcileCandidate) *models.NotificationPayload {
	local := c.DeadlineAt.In(s.cfg.App.SystemTZ)
	localText := local.Format("02.01.2006 15:04")
	lang := locale.Normalize(c.RecipientLocale)
	subject, body := renderTemplate(lang, kind, c.EventTitle, c.RegistrationURL, localText, s.cfg.App.SystemTZID)
	return &models.NotificationPayload{
		EventTitle:      c.EventTitle,
		RegistrationURL: c.RegistrationURL,
		DeadlineUTC:     c.DeadlineAt.UTC(),
		DeadlineLocal:   localText,
		TimezoneID:      s.cfg.App.SystemTZID,
		Type:            string(kind),
		Language:        lang,
		Subject:         subject,
		Body:            body,
	}
}

func renderTemplate(lang string, kind models.NotificationType,
	title, url, deadlineLocal, timezone string) (string, string) {
	var name string
	switch kind {
	case models.NotificationOverdue:
		name = "overdue"
	case models.NotificationReminder:
		name = "reminder"
	default:
		name = "primary"
	}
	args := []string{"title", title, "url", url, "deadline", deadlineLocal, "timezone", timezone}
	return locale.Message(lang, "notification."+name+".subject", args...),
		locale.Message(lang, "notification."+name+".body", args...)
}

func (s *NotificationService) CancelForStatus(ctx context.Context, statusID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{StatusID: &statusID})
	return err
}

func (s *NotificationService) CancelForParticipant(ctx context.Context, participantID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{ParticipantID: &participantID})
	return err
}

func (s *NotificationService) CancelForRegistration(ctx context.Context, registrationID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{RegistrationID: &registrationID})
	return err
}

func (s *NotificationService) CancelForEvent(ctx context.Context, eventID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{EventID: &eventID})
	return err
}

func (s *NotificationService) CancelForRecipient(ctx context.Context, userID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, repositories.CancelScope{RecipientID: &userID})
	return err
}
