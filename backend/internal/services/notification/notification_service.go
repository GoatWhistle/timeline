package notification

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

type NotificationService struct {
	repo *notification.Notifications
	cfg  *config.Config
	now  func() time.Time
}

func NewNotificationService(repo *notification.Notifications, cfg *config.Config) *NotificationService {
	return &NotificationService{repo: repo, cfg: cfg, now: func() time.Time { return time.Now().UTC() }}
}

func PrimaryKey(participantID uuid.UUID, assignmentVersion, activationVersion, contentVersion int) string {
	return fmt.Sprintf("required:%s:av%d:rv%d:cv%d",
		participantID, assignmentVersion, activationVersion, contentVersion)
}

func RuleKey(kind models.NotificationType, statusID, ruleID uuid.UUID, scheduleVersion, todoCycle, contentVersion int,
) string {
	prefix := "reminder"
	if kind == models.NotificationOverdue {
		prefix = "overdue"
	}
	return fmt.Sprintf("%s:%s:%s:sv%d:tc%d:cv%d", prefix, statusID, ruleID, scheduleVersion, todoCycle, contentVersion)
}

func ChooseChannel(channels models.RecipientChannels, override *models.Channel, exclude []models.Channel,
) (models.Channel, bool) {
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

func (s *NotificationService) CreatePrimary(ctx context.Context, c models.ReconcileCandidate,
) (*models.Notification, bool, error) {
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
		LogicalKey: PrimaryKey(
			c.ParticipantID, c.AssignmentVersion, c.ActivationVersion, c.ContentVersion),
		RequestedChannel: channel,
		ScheduledAt:      now,
		NextAttemptAt:    &now,
		Payload:          s.payload(models.NotificationRequired, c),
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
		LogicalKey: RuleKey(
			kind, c.StatusID, rule.ID, c.ScheduleVersion, c.TodoCycle, c.ContentVersion),
		RequestedChannel: channel,
		ScheduledAt:      scheduledAt,
		NextAttemptAt:    &now,
		Payload:          s.payload(kind, c),
	}
	return s.repo.Insert(ctx, notification)
}

func (s *NotificationService) Render(kind models.NotificationType, c models.ReconcileCandidate,
) *models.NotificationPayload {
	return s.payload(kind, c)
}

func (s *NotificationService) payload(kind models.NotificationType, c models.ReconcileCandidate,
) *models.NotificationPayload {
	zone, zoneID := s.recipientZone(c.RecipientTimezone)
	localText := c.DeadlineAt.In(zone).Format("02.01.2006 15:04")
	lang := locale.Normalize(c.RecipientLocale)
	subject, body := renderTemplate(lang, kind, c.EventTitle, c.RegistrationURL, localText, zoneID)
	return &models.NotificationPayload{
		EventTitle:      c.EventTitle,
		RegistrationURL: c.RegistrationURL,
		DeadlineUTC:     c.DeadlineAt.UTC(),
		DeadlineLocal:   localText,
		TimezoneID:      zoneID,
		Type:            string(kind),
		Language:        lang,
		Subject:         subject,
		Body:            body,
	}
}

func (s *NotificationService) recipientZone(id string) (*time.Location, string) {
	trimmed := strings.TrimSpace(id)
	if trimmed == "" {
		return s.cfg.App.SystemTZ, s.cfg.App.SystemTZID
	}
	zone, err := time.LoadLocation(trimmed)
	if err != nil {
		return s.cfg.App.SystemTZ, s.cfg.App.SystemTZID
	}
	return zone, trimmed
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
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{StatusID: &statusID})
	return err
}

func (s *NotificationService) CancelForParticipant(ctx context.Context, participantID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{ParticipantID: &participantID})
	return err
}

func (s *NotificationService) CancelForRegistration(ctx context.Context, registrationID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{RegistrationID: &registrationID})
	return err
}

func (s *NotificationService) CancelForEvent(ctx context.Context, eventID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{EventID: &eventID})
	return err
}

func (s *NotificationService) CancelForRecipient(ctx context.Context, userID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{RecipientID: &userID})
	return err
}
