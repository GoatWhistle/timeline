//go:build integration

package scheduler_test

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestMutedChannelPreferenceIsNeverScheduled(t *testing.T) {
	s := newStand(t)
	s.mute(models.NotificationRequired, models.ChannelEmail)

	result := s.reconcile()
	if result.Primary != 1 {
		t.Fatalf("expected exactly one primary notification on the remaining channel, got %+v", result)
	}
	channels := s.channels()
	if len(channels) != 1 || channels[0] != models.ChannelTelegram {
		t.Fatalf("a muted channel was scheduled: %v", channels)
	}
}

func TestMutingEveryChannelForAnOccasionCreatesNothing(t *testing.T) {
	s := newStand(t)
	s.mute(models.NotificationRequired, models.ChannelEmail)
	s.mute(models.NotificationRequired, models.ChannelTelegram)

	result := s.reconcile()
	if result.Primary != 0 {
		t.Fatalf("a fully muted occasion still produced notifications: %+v", result)
	}
	if got := s.countAll(); got != 0 {
		t.Fatalf("expected no notifications for a fully muted occasion, got %d (%v)", got, s.channels())
	}
}

func TestMutingOneOccasionLeavesTheOtherAlone(t *testing.T) {
	s := newStand(t)
	s.addRule(60, 1)
	s.mute(models.NotificationRequired, models.ChannelEmail)
	s.mute(models.NotificationRequired, models.ChannelTelegram)

	result := s.reconcile()
	if result.Primary != 0 {
		t.Fatalf("the muted occasion still produced notifications: %+v", result)
	}
	if result.Reminder != 2 {
		t.Fatalf("muting one occasion suppressed another, reminders: %+v", result)
	}
	if got := s.countByType(models.NotificationRequired); got != 0 {
		t.Fatalf("expected no REGISTRATION_REQUIRED rows, got %d", got)
	}
	if got := s.countByType(models.NotificationReminder); got != 2 {
		t.Fatalf("expected two REGISTRATION_REMINDER rows, got %d", got)
	}
}

func TestRemovedParticipantIsNeverScheduledAgain(t *testing.T) {
	s := newStand(t)
	s.addRule(60, 1)
	s.exec(`UPDATE event_participants SET participation_status = 'REMOVED', removed_at = now()
		WHERE id = $1`, s.ParticipantID)

	result := s.reconcile()
	if result.Scanned != 0 {
		t.Fatalf("a REMOVED participant must not be a reconciliation candidate, scanned %d", result.Scanned)
	}
	if got := s.countAll(); got != 0 {
		t.Fatalf("expected no notifications for a removed participant, got %d", got)
	}
}

func TestDisabledRegistrationIsNeverScheduled(t *testing.T) {
	s := newStand(t)
	s.addRule(60, 1)
	s.exec(`UPDATE registrations SET state = 'DISABLED' WHERE id = $1`, s.RegistrationID)

	result := s.reconcile()
	if result.Scanned != 0 {
		t.Fatalf("a DISABLED registration must not be a reconciliation candidate, scanned %d", result.Scanned)
	}
	if got := s.countAll(); got != 0 {
		t.Fatalf("expected no notifications for a disabled registration, got %d", got)
	}
}

func TestArchivedEventIsNeverScheduled(t *testing.T) {
	s := newStand(t)
	s.addRule(60, 1)
	s.exec(`UPDATE events SET archived_at = now() WHERE id = $1`, s.EventID)

	result := s.reconcile()
	if result.Scanned != 0 {
		t.Fatalf("an archived event must not be a reconciliation candidate, scanned %d", result.Scanned)
	}
	if got := s.countAll(); got != 0 {
		t.Fatalf("expected no notifications for an archived event, got %d", got)
	}
}
