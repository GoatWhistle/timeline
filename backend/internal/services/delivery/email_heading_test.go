package delivery

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestEmailHeadingDiffersFromTheSubjectLine(t *testing.T) {
	kinds := []models.NotificationType{
		models.NotificationRequired,
		models.NotificationOverdue,
		models.NotificationDeadlineReminder,
		models.NotificationEventStartReminder,
		models.NotificationStageStartReminder,
		models.NotificationEventEndReminder,
		models.NotificationWeeklyDigest,
		models.NotificationPersonalTaskDue,
		models.NotificationRetrospectiveDue,
	}

	for _, kind := range kinds {
		n := &models.Notification{
			NotificationType: kind,
			Payload:          &models.NotificationPayload{Subject: "What is on this week in Timeline"},
		}
		heading := emailHeading("en", n)
		if heading == "" {
			t.Fatalf("%s produced an empty heading", kind)
		}
		if heading == n.Payload.Subject {
			t.Errorf("%s repeats the subject as its heading: a reader sees the same sentence twice", kind)
		}
	}
}

func TestEmailHeadingFallsBackToTheSubjectWhenNoneIsWritten(t *testing.T) {
	n := &models.Notification{
		NotificationType: models.NotificationType("SOMETHING_NEW"),
		Payload:          &models.NotificationPayload{Subject: "A subject that must survive"},
	}
	if got := emailHeading("en", n); got == "" {
		t.Fatal("an unknown kind left the letter with no heading at all")
	}
}

func TestEmailHeadingSpeaksTheReaderLanguage(t *testing.T) {
	n := &models.Notification{
		NotificationType: models.NotificationWeeklyDigest,
		Payload:          &models.NotificationPayload{Subject: "subject"},
	}
	en := emailHeading("en", n)
	ru := emailHeading("ru", n)
	if en == ru {
		t.Errorf("the heading reads the same in both languages: %q", en)
	}
}
