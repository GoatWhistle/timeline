package notification

import (
	"context"
	"time"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *NotificationService) CreateMomentReminder(ctx context.Context, c models.MomentCandidate,
	daysBefore, reminderVersion int, scheduledAt time.Time) (int, error) {
	if err := s.loadMutedPreferences(ctx, c.RecipientID, &c.RecipientChannels); err != nil {
		return 0, err
	}
	if c.RecipientChannels.MutedEntirely(c.Occasion) {
		return 0, nil
	}

	channels := wantedOrDefault(c.RecipientChannels.Wanted(c.Occasion))
	now := s.now()
	payload := s.momentPayload(c, daysBefore)
	created := 0
	for _, channel := range channels {
		entry := &models.Notification{
			NotificationType:           c.Occasion,
			RecipientUserID:            c.RecipientID,
			EventID:                    &c.EventID,
			StageID:                    c.StageID,
			ReminderDaysBefore:         &daysBefore,
			ReminderScheduleVersion:    &reminderVersion,
			NotificationContentVersion: 1,
			LogicalKey: MomentReminderKey(c.Occasion, c.EventID, c.StageID, c.RecipientID,
				daysBefore, reminderVersion, channel),
			RequestedChannel: channel,
			ScheduledAt:      scheduledAt,
			NextAttemptAt:    &now,
			Payload:          payload,
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
		s.writeMomentInboxItem(ctx, c, daysBefore, reminderVersion, payload)
	}
	return created, nil
}

func (s *NotificationService) momentPayload(c models.MomentCandidate,
	daysBefore int) *models.NotificationPayload {
	zone, zoneID := s.recipientZone(c.RecipientTimezone)
	localText := c.MomentAt.In(zone).Format("02.01.2006 15:04")
	lang := locale.Normalize(c.RecipientLocale)
	name := momentTemplateName(c.Occasion)
	args := []string{"title", c.EventTitle, "subject", c.Subject(),
		"moment", localText, "timezone", zoneID, "days", itoa(daysBefore)}

	return &models.NotificationPayload{
		EventTitle:    c.EventTitle,
		DeadlineUTC:   c.MomentAt.UTC(),
		DeadlineLocal: localText,
		TimezoneID:    zoneID,
		Type:          string(c.Occasion),
		Language:      lang,
		Subject:       locale.Message(lang, "notification."+name+".subject", args...),
		Body:          locale.Message(lang, "notification."+name+".body", args...),
		TelegramText: renderMomentTelegramText(lang, name, c.Subject(), localText, zoneID,
			itoa(daysBefore)),
		EventURL: eventURL(s.cfg.App.PublicURL, c.EventDisplayID),
	}
}

func momentTemplateName(occasion models.NotificationOccasion) string {
	switch occasion {
	case models.NotificationEventStartReminder:
		return "event_start"
	case models.NotificationEventEndReminder:
		return "event_end"
	default:
		return "stage_start"
	}
}
