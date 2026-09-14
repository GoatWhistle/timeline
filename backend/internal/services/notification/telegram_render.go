package notification

import (
	"html"
	"strconv"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

func itoa(value int) string { return strconv.Itoa(value) }

func telegramHeadingKey(kind models.NotificationType) string {
	switch kind {
	case models.NotificationOverdue:
		return "notification.overdue.telegram.heading"
	case models.NotificationDeadlineReminder:
		return "notification.reminder.telegram.heading"
	default:
		return "notification.primary.telegram.heading"
	}
}

func renderTelegramText(lang string, kind models.NotificationType, title, deadlineLocal, timezone string) string {
	heading := locale.Message(lang, telegramHeadingKey(kind))
	deadline := locale.Message(lang, "notification.telegram.deadline", "deadline", deadlineLocal, "timezone", timezone)
	return "<b>" + html.EscapeString(heading) + "</b>\n" + html.EscapeString(title) + "\n\n" + deadline
}

func renderMomentTelegramText(lang, name, subject, momentLocal, timezone, days string) string {
	heading := locale.Message(lang, "notification."+name+".telegram.heading", "days", days)
	moment := locale.Message(lang, "notification.telegram.moment",
		"moment", momentLocal, "timezone", timezone)
	return "<b>" + html.EscapeString(heading) + "</b>\n" + html.EscapeString(subject) + "\n\n" + moment
}

func eventURL(publicURL, eventDisplayID string) string {
	if eventDisplayID == "" {
		return ""
	}
	return publicURL + "/events/" + eventDisplayID
}
