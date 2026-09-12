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

type InboxWriter interface {
	Create(ctx context.Context, item *models.InboxItem) error
}

type NotificationService struct {
	repo  *notification.Notifications
	prefs *notification.Preferences
	cfg   *config.Config
	inbox InboxWriter
	now   func() time.Time
}

func NewNotificationService(repo *notification.Notifications, prefs *notification.Preferences,
	cfg *config.Config) *NotificationService {
	return &NotificationService{repo: repo, prefs: prefs, cfg: cfg,
		now: func() time.Time { return time.Now().UTC() }}
}

func (s *NotificationService) WithInbox(inbox InboxWriter) { s.inbox = inbox }

func PrimaryKey(participantID uuid.UUID, assignmentVersion, activationVersion, contentVersion int,
	channel models.Channel) string {
	return fmt.Sprintf("required:%s:av%d:rv%d:cv%d:ch%s",
		participantID, assignmentVersion, activationVersion, contentVersion, channel)
}

func RuleKey(kind models.NotificationType, statusID, ruleID uuid.UUID, scheduleVersion, todoCycle, contentVersion int,
	channel models.Channel) string {
	prefix := "reminder"
	if kind == models.NotificationOverdue {
		prefix = "overdue"
	}
	return fmt.Sprintf("%s:%s:%s:sv%d:tc%d:cv%d:ch%s",
		prefix, statusID, ruleID, scheduleVersion, todoCycle, contentVersion, channel)
}

func (s *NotificationService) recipientChannels(ctx context.Context, c *models.ReconcileCandidate) error {
	return s.loadMutedPreferences(ctx, c.RecipientID, &c.RecipientChannels)
}

func (s *NotificationService) loadMutedPreferences(ctx context.Context, userID uuid.UUID,
	channels *models.RecipientChannels) error {
	if s.prefs == nil || channels.Preferences != nil {
		return nil
	}
	prefs, err := s.prefs.Muted(ctx, userID)
	if err != nil {
		return err
	}
	channels.Preferences = prefs
	return nil
}

func wantedOrDefault(channels models.ChannelSet) models.ChannelSet {
	if len(channels) > 0 {
		return channels
	}
	return models.ChannelSet{models.ChannelEmail}
}

func (s *NotificationService) CreatePrimary(ctx context.Context, c models.ReconcileCandidate,
) (int, error) {
	if err := s.recipientChannels(ctx, &c); err != nil {
		return 0, err
	}
	channels := wantedOrDefault(c.RecipientChannels.Wanted(models.NotificationRequired))
	now := s.now()
	created := 0
	for _, channel := range channels {
		notification := &models.Notification{
			NotificationType:           models.NotificationRequired,
			RecipientUserID:            c.RecipientID,
			RegistrationStatusID:       &c.StatusID,
			AssignmentVersion:          &c.AssignmentVersion,
			ActivationVersion:          &c.ActivationVersion,
			NotificationContentVersion: c.ContentVersion,
			LogicalKey: PrimaryKey(
				c.ParticipantID, c.AssignmentVersion, c.ActivationVersion, c.ContentVersion, channel),
			RequestedChannel: channel,
			ScheduledAt:      now,
			NextAttemptAt:    &now,
			Payload:          s.payload(models.NotificationRequired, c),
		}
		_, ok, err := s.repo.Insert(ctx, notification)
		if err != nil {
			return created, err
		}
		if ok {
			created++
		}
	}
	if created > 0 {
		s.writeInboxItem(ctx, models.NotificationRequired, c, inboxPrimaryKey(c))
	}
	return created, nil
}

func (s *NotificationService) CreateForRule(ctx context.Context, c models.ReconcileCandidate,
	rule models.NotificationRule, scheduledAt time.Time) (int, error) {
	if err := s.recipientChannels(ctx, &c); err != nil {
		return 0, err
	}
	kind := rule.NotificationType()
	channels := wantedOrDefault(c.RecipientChannels.Wanted(kind))
	now := s.now()
	ruleID := rule.ID
	created := 0
	for _, channel := range channels {
		notification := &models.Notification{
			NotificationType:           kind,
			RecipientUserID:            c.RecipientID,
			RegistrationStatusID:       &c.StatusID,
			RuleID:                     &ruleID,
			ScheduleVersion:            &c.ScheduleVersion,
			TodoCycle:                  &c.TodoCycle,
			NotificationContentVersion: c.ContentVersion,
			LogicalKey: RuleKey(
				kind, c.StatusID, rule.ID, c.ScheduleVersion, c.TodoCycle, c.ContentVersion, channel),
			RequestedChannel: channel,
			ScheduledAt:      scheduledAt,
			NextAttemptAt:    &now,
			Payload:          s.payload(kind, c),
		}
		_, ok, err := s.repo.Insert(ctx, notification)
		if err != nil {
			return created, err
		}
		if ok {
			created++
		}
	}
	if created > 0 {
		s.writeInboxItem(ctx, kind, c, inboxRuleKey(c, rule.ID))
	}
	return created, nil
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
		TelegramText:    renderTelegramText(lang, kind, c.EventTitle, localText, zoneID),
		EventURL:        eventURL(s.cfg.App.PublicURL, c.EventDisplayID),
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
