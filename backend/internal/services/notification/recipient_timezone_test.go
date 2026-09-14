package notification

import (
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func zoneCandidate(timezone string) models.ReconcileCandidate {
	c := candidate("en")
	c.RecipientTimezone = timezone
	return c
}

func TestPayloadRendersDeadlineInRecipientTimezone(t *testing.T) {
	svc := NewNotificationService(nil, nil, testConfig(t))

	tokyo := svc.Render(models.NotificationDeadlineReminder, zoneCandidate("Asia/Tokyo"))
	if tokyo.TimezoneID != "Asia/Tokyo" {
		t.Fatalf("timezone_id = %q, want Asia/Tokyo", tokyo.TimezoneID)
	}
	if tokyo.DeadlineLocal != "01.09.2026 21:00" {
		t.Fatalf("deadline in Tokyo = %q, want 01.09.2026 21:00", tokyo.DeadlineLocal)
	}
	if !strings.Contains(tokyo.Body, "Asia/Tokyo") {
		t.Fatalf("body does not name the recipient zone: %q", tokyo.Body)
	}

	moscow := svc.Render(models.NotificationDeadlineReminder, zoneCandidate("Europe/Moscow"))
	if moscow.DeadlineLocal != "01.09.2026 15:00" {
		t.Fatalf("deadline in Moscow = %q, want 01.09.2026 15:00", moscow.DeadlineLocal)
	}
	if moscow.DeadlineLocal == tokyo.DeadlineLocal {
		t.Fatal("two recipients in different zones received the same local time")
	}
}

func TestPayloadFallsBackToSystemTimezone(t *testing.T) {
	svc := NewNotificationService(nil, nil, testConfig(t))

	for _, timezone := range []string{"", "Mars/Olympus", "   "} {
		payload := svc.Render(models.NotificationDeadlineReminder, zoneCandidate(timezone))
		if payload.TimezoneID != "UTC" {
			t.Fatalf("timezone %q produced timezone_id %q, want the system UTC",
				timezone, payload.TimezoneID)
		}
		if payload.DeadlineLocal != "01.09.2026 12:00" {
			t.Fatalf("timezone %q produced local time %q, want the system 01.09.2026 12:00",
				timezone, payload.DeadlineLocal)
		}
	}
}

func TestPayloadSnapshotIgnoresLaterTimezoneChange(t *testing.T) {
	svc := NewNotificationService(nil, nil, testConfig(t))

	c := zoneCandidate("Asia/Tokyo")
	frozen := svc.Render(models.NotificationDeadlineReminder, c)

	c.RecipientTimezone = "America/New_York"
	later := svc.Render(models.NotificationDeadlineReminder, c)

	if frozen.TimezoneID != "Asia/Tokyo" {
		t.Fatalf("the existing snapshot changed zone to %q", frozen.TimezoneID)
	}
	if frozen.DeadlineLocal != "01.09.2026 21:00" {
		t.Fatalf("the existing snapshot changed local time to %q", frozen.DeadlineLocal)
	}
	if later.TimezoneID != "America/New_York" {
		t.Fatalf("the next notification used %q, want the new zone", later.TimezoneID)
	}
}

func TestDeadlineLocalIsNotUTCWhenRecipientZoneDiffers(t *testing.T) {
	svc := NewNotificationService(nil, nil, testConfig(t))

	payload := svc.Render(models.NotificationOverdue, zoneCandidate("Asia/Tokyo"))
	utcText := payload.DeadlineUTC.Format("02.01.2006 15:04")
	if payload.DeadlineLocal == utcText {
		t.Fatalf("local time %q equals the UTC time: the recipient zone was ignored",
			payload.DeadlineLocal)
	}
	if payload.DeadlineUTC != time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC) {
		t.Fatalf("the UTC deadline was rewritten to %s", payload.DeadlineUTC)
	}
}
