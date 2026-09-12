package notification

import (
	"context"
	"html"
	"time"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *NotificationService) CreatePersonal(ctx context.Context, notice models.PersonalNotice) (int, error) {
	if err := s.loadMutedPreferences(ctx, notice.RecipientID, &notice.RecipientChannels); err != nil {
		return 0, err
	}
	channels := wantedOrDefault(notice.RecipientChannels.Wanted(notice.Type))
	now := s.now()
	created := 0
	payload := s.personalPayload(notice)
	for _, channel := range channels {
		n := &models.Notification{
			NotificationType:           notice.Type,
			RecipientUserID:            notice.RecipientID,
			NotificationContentVersion: 1,
			LogicalKey:                 notice.LogicalKeyBase + ":ch" + string(channel),
			RequestedChannel:           channel,
			ScheduledAt:                now,
			NextAttemptAt:              &now,
			Payload:                    payload,
		}
		_, ok, err := s.repo.Insert(ctx, n)
		if err != nil {
			return created, err
		}
		if ok {
			created++
		}
	}
	return created, nil
}

func (s *NotificationService) personalPayload(notice models.PersonalNotice) *models.NotificationPayload {
	lang := locale.Normalize(notice.RecipientLocale)
	deadlineUTC := time.Time{}
	deadlineLocal := ""
	zoneID := s.cfg.App.SystemTZID
	if notice.DeadlineAt != nil {
		zone, id := s.recipientZone(notice.RecipientTimezone)
		deadlineUTC = notice.DeadlineAt.UTC()
		deadlineLocal = notice.DeadlineAt.In(zone).Format("02.01.2006 15:04")
		zoneID = id
	}
	link := notice.LinkURL
	if link == "" {
		link = eventURL(s.cfg.App.PublicURL, notice.EventDisplayID)
	}
	return &models.NotificationPayload{
		EventTitle:    notice.EventTitle,
		DeadlineUTC:   deadlineUTC,
		DeadlineLocal: deadlineLocal,
		TimezoneID:    zoneID,
		Type:          string(notice.Type),
		Language:      lang,
		Subject:       notice.Subject,
		Body:          notice.Body,
		TelegramText:  personalTelegramText(notice.TelegramHeading, notice.Body),
		EventURL:      link,
	}
}

func personalTelegramText(heading, body string) string {
	return "<b>" + html.EscapeString(heading) + "</b>\n" + html.EscapeString(body)
}
