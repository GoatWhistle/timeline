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

func DeadlineReminderKey(statusID uuid.UUID, daysBefore, scheduleVersion, todoCycle, contentVersion,
	reminderVersion int, channel models.Channel) string {
	return fmt.Sprintf("reminder:%s:%s:d%d:sv%d:tc%d:cv%d:rv%d:ch%s",
		models.NotificationDeadlineReminder, statusID, daysBefore,
		scheduleVersion, todoCycle, contentVersion, reminderVersion, channel)
}

func OverdueKey(statusID uuid.UUID, scheduleVersion, todoCycle, contentVersion,
	reminderVersion int, channel models.Channel) string {
	return fmt.Sprintf("overdue:%s:sv%d:tc%d:cv%d:rv%d:ch%s",
		statusID, scheduleVersion, todoCycle, contentVersion, reminderVersion, channel)
}

func MomentReminderKey(occasion models.NotificationOccasion, eventID uuid.UUID, stageID *uuid.UUID,
	recipientID uuid.UUID, daysBefore, reminderVersion int, channel models.Channel) string {
	subject := eventID.String()
	if stageID != nil {
		subject = stageID.String()
	}
	return fmt.Sprintf("moment:%s:%s:%s:d%d:rv%d:ch%s",
		occasion, subject, recipientID, daysBefore, reminderVersion, channel)
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
	if c.RecipientChannels.MutedEntirely(models.NotificationRequired) {
		return 0, nil
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

func (s *NotificationService) CreateDeadlineReminder(ctx context.Context, c models.ReconcileCandidate,
	daysBefore, reminderVersion int, scheduledAt time.Time) (int, error) {
	kind := models.NotificationDeadlineReminder
	return s.createRegistrationReminder(ctx, c, kind, &daysBefore, reminderVersion, scheduledAt,
		func(channel models.Channel) string {
			return DeadlineReminderKey(c.StatusID, daysBefore, c.ScheduleVersion, c.TodoCycle,
				c.ContentVersion, reminderVersion, channel)
		})
}

func (s *NotificationService) CreateOverdue(ctx context.Context, c models.ReconcileCandidate,
	reminderVersion int, scheduledAt time.Time) (int, error) {
	return s.createRegistrationReminder(ctx, c, models.NotificationOverdue, nil, reminderVersion,
		scheduledAt, func(channel models.Channel) string {
			return OverdueKey(c.StatusID, c.ScheduleVersion, c.TodoCycle, c.ContentVersion,
				reminderVersion, channel)
		})
}

func (s *NotificationService) createRegistrationReminder(ctx context.Context,
	c models.ReconcileCandidate, kind models.NotificationType, daysBefore *int, reminderVersion int,
	scheduledAt time.Time, key func(models.Channel) string) (int, error) {
	if err := s.recipientChannels(ctx, &c); err != nil {
		return 0, err
	}
	if c.RecipientChannels.MutedEntirely(kind) {
		return 0, nil
	}
	channels := wantedOrDefault(c.RecipientChannels.Wanted(kind))
	now := s.now()
	created := 0
	for _, channel := range channels {
		entry := &models.Notification{
			NotificationType:           kind,
			RecipientUserID:            c.RecipientID,
			RegistrationStatusID:       &c.StatusID,
			ScheduleVersion:            &c.ScheduleVersion,
			TodoCycle:                  &c.TodoCycle,
			ReminderDaysBefore:         daysBefore,
			ReminderScheduleVersion:    &reminderVersion,
			NotificationContentVersion: c.ContentVersion,
			LogicalKey:                 key(channel),
			RequestedChannel:           channel,
			ScheduledAt:                scheduledAt,
			NextAttemptAt:              &now,
			Payload:                    s.payload(kind, c),
		}
		_, ok, err := s.repo.Insert(ctx, entry)
		if err != nil {
			return created, err
		}
		if ok {
			created++
		}
	}
	if created > 0 {
		s.writeInboxItem(ctx, kind, c, inboxReminderKey(c, kind, daysBefore, reminderVersion))
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
	case models.NotificationDeadlineReminder:
		name = "reminder"
	default:
		name = "primary"
	}
	args := []string{"title", title, "url", url, "deadline", deadlineLocal, "timezone", timezone}
	return locale.Message(lang, "notification."+name+".subject", args...),
		locale.Message(lang, "notification."+name+".body", args...)
}
