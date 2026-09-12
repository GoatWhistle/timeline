package digest

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *DigestService) notifyRecipient(ctx context.Context, recipient models.DigestRecipient,
	digest *models.WeeklyDigest) error {
	if s.notifier == nil {
		return nil
	}
	lang := locale.Normalize(recipient.Locale)
	location := s.zone(recipient.Timezone)
	_, err := s.notifier.CreatePersonal(ctx, models.PersonalNotice{
		Type:              models.NotificationWeeklyDigest,
		RecipientID:       recipient.UserID,
		RecipientLocale:   recipient.Locale,
		RecipientTimezone: recipient.Timezone,
		RecipientChannels: recipient.RecipientChannels,
		Subject:           locale.Message(lang, "digest.weekly.subject"),
		Body:              digestBody(digest, lang, location),
		TelegramHeading:   locale.Message(lang, "notification.weekly_digest.telegram.heading"),
		LinkURL:           s.app.PublicURL + "/catalog",
		LogicalKeyBase:    "personal-" + weeklyDigestKey(recipient.UserID, digest.WeekStart),
	})
	return err
}
