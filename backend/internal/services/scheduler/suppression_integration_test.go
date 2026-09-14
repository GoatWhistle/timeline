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
	s.want(models.NotificationDeadlineReminder, 1)
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
	if got := s.countByType(models.NotificationDeadlineReminder); got != 2 {
		t.Fatalf("expected two REMINDER_REGISTRATION_DEADLINE rows, got %d", got)
	}
}

func TestDeadlineReminderStopsOnceTheParticipantMarkedRegistered(t *testing.T) {
	s := newStand(t)
	s.want(models.NotificationDeadlineReminder, 1)
	s.exec(`UPDATE registration_statuses SET status = 'DONE', registered_at = now()
		WHERE id = $1`, s.StatusID)

	result := s.reconcile()
	if got := s.countByType(models.NotificationDeadlineReminder); got != 0 {
		t.Fatalf("a participant who marked the registration still got a deadline reminder: %d rows (%+v)",
			got, result)
	}
}

func TestOverdueStopsOnceTheParticipantMarkedRegistered(t *testing.T) {
	s := newStand(t)
	s.wantOverdue()
	s.atOverdue()
	s.exec(`UPDATE registration_statuses SET status = 'DONE', registered_at = now()
		WHERE id = $1`, s.StatusID)

	result := s.reconcile()
	if got := s.countByType(models.NotificationOverdue); got != 0 {
		t.Fatalf("a participant who marked the registration still got an overdue notice: %d rows (%+v)",
			got, result)
	}
}

func TestEventStartReminderIgnoresTheRegistrationMark(t *testing.T) {
	s := newStand(t)
	s.want(models.NotificationEventStartReminder, 1)
	s.exec(`UPDATE registration_statuses SET status = 'DONE', registered_at = now()
		WHERE id = $1`, s.StatusID)
	s.atEventStartReminder()

	s.reconcile()
	if got := s.countByType(models.NotificationEventStartReminder); got == 0 {
		t.Fatal("marking the registration silenced the reminder about the event starting, " +
			"which has nothing to do with registering")
	}
}

func TestStageStartReminderIgnoresTheRegistrationMark(t *testing.T) {
	s := newStand(t)
	s.want(models.NotificationStageStartReminder, 1)
	s.exec(`UPDATE registration_statuses SET status = 'DONE', registered_at = now()
		WHERE id = $1`, s.StatusID)
	s.atStageStartReminder()

	s.reconcile()
	if got := s.countByType(models.NotificationStageStartReminder); got == 0 {
		t.Fatal("marking the registration silenced the reminder about a stage starting")
	}
}

func TestEventStartReminderReachesAParticipantWithoutAnyRegistration(t *testing.T) {
	s := newStand(t)
	s.want(models.NotificationEventStartReminder, 1)
	s.dropRegistration()
	s.atEventStartReminder()

	s.reconcile()
	if got := s.countByType(models.NotificationEventStartReminder); got == 0 {
		t.Fatal("an event without a registration told its participants nothing about starting, " +
			"so the organiser still decides whether reminders happen at all")
	}
}

func TestAnEmptyScheduleAsksForNoReminders(t *testing.T) {
	s := newStand(t)
	s.atEventStartReminder()

	s.reconcile()
	if got := s.countByType(models.NotificationEventStartReminder); got != 0 {
		t.Fatalf("an empty schedule still produced %d event reminders", got)
	}
	if got := s.countByType(models.NotificationDeadlineReminder); got != 0 {
		t.Fatalf("an empty schedule still produced %d deadline reminders", got)
	}
}

func TestOnlyTheChosenDaysProduceReminders(t *testing.T) {
	s := newStand(t)
	s.want(models.NotificationDeadlineReminder, 1)

	s.reconcile()
	if got := s.countReminderDays(models.NotificationDeadlineReminder); len(got) != 1 || got[0] != 1 {
		t.Fatalf("expected reminders for day 1 alone, got %v", got)
	}
}

func TestRemovedParticipantIsNeverScheduledAgain(t *testing.T) {
	s := newStand(t)
	s.want(models.NotificationDeadlineReminder, 1)
	s.exec(`UPDATE event_participants SET participation_status = 'REMOVED', removed_at = now()
		WHERE id = $1`, s.ParticipantID)

	result := s.reconcile()
	if got := s.countAll(); got != 0 {
		t.Fatalf("expected no notifications for a removed participant, got %d (%+v)", got, result)
	}
}

func TestDisabledRegistrationIsNeverScheduled(t *testing.T) {
	s := newStand(t)
	s.want(models.NotificationDeadlineReminder, 1)
	s.exec(`UPDATE registrations SET state = 'DISABLED' WHERE id = $1`, s.RegistrationID)

	s.reconcile()
	if got := s.countByType(models.NotificationRequired); got != 0 {
		t.Fatalf("expected no primary notifications for a disabled registration, got %d", got)
	}
	if got := s.countByType(models.NotificationDeadlineReminder); got != 0 {
		t.Fatalf("expected no deadline reminders for a disabled registration, got %d", got)
	}
}

func TestArchivedEventIsNeverScheduled(t *testing.T) {
	s := newStand(t)
	s.want(models.NotificationDeadlineReminder, 1)
	s.want(models.NotificationEventStartReminder, 1)
	s.exec(`UPDATE events SET archived_at = now() WHERE id = $1`, s.EventID)

	result := s.reconcile()
	if result.Scanned != 0 {
		t.Fatalf("an archived event must not be a reconciliation candidate, scanned %d", result.Scanned)
	}
	if got := s.countAll(); got != 0 {
		t.Fatalf("expected no notifications for an archived event, got %d", got)
	}
}

func TestChangingTheScheduleLetsTheSameDayBeSentAgain(t *testing.T) {
	s := newStand(t)
	s.want(models.NotificationDeadlineReminder, 1)

	first := s.reconcile()
	if first.Reminder == 0 {
		t.Fatal("the first pass created no reminder to supersede")
	}
	before := s.countByType(models.NotificationDeadlineReminder)

	repeat := s.reconcile()
	if repeat.Reminder != 0 {
		t.Fatalf("an unchanged schedule created the same reminder twice: %+v", repeat)
	}

	s.bumpScheduleVersion()

	after := s.reconcile()
	if after.Reminder == 0 {
		t.Fatal("editing the schedule did not let the reminder be raised again: the logical key " +
			"does not separate a reminder from the same reminder after a change of mind")
	}
	if got := s.countByType(models.NotificationDeadlineReminder); got <= before {
		t.Fatalf("the reminder count stayed at %d after the schedule changed", got)
	}
}
