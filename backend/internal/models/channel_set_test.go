package models_test

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestRecipientChannelsMutingOneChannelLeavesTheOtherWorking(t *testing.T) {
	channels := models.RecipientChannels{
		TelegramLinked: true,
		EmailVerified:  true,
		Selected:       models.ChannelSet{models.ChannelTelegram, models.ChannelEmail},
		Preferences: models.NotificationPreferences{
			models.NotificationDeadlineReminder: models.ChannelSet{models.ChannelEmail},
		},
	}

	deliverable := channels.Deliverable(models.NotificationDeadlineReminder)
	if !deliverable.Has(models.ChannelTelegram) {
		t.Fatalf("telegram must stay deliverable when only email is muted, got %v", deliverable)
	}
	if deliverable.Has(models.ChannelEmail) {
		t.Fatalf("email must be muted for this occasion, got %v", deliverable)
	}

	other := channels.Deliverable(models.NotificationOverdue)
	if !other.Has(models.ChannelTelegram) || !other.Has(models.ChannelEmail) {
		t.Fatalf("muting one occasion must not affect another, got %v", other)
	}
}

func TestNotificationPreferencesAllowsDefaultsToTrueForAnUntouchedPair(t *testing.T) {
	prefs := models.NotificationPreferences{}
	if !prefs.Allows(models.NotificationRequired, models.ChannelTelegram) {
		t.Fatalf("an occasion never muted must remain allowed")
	}
}

func TestRecipientChannelsDeliverableRespectsAvailability(t *testing.T) {
	channels := models.RecipientChannels{
		TelegramLinked: false,
		EmailVerified:  true,
		Selected:       models.ChannelSet{models.ChannelTelegram, models.ChannelEmail},
		Preferences:    models.NotificationPreferences{},
	}

	deliverable := channels.Deliverable(models.NotificationRequired)
	if deliverable.Has(models.ChannelTelegram) {
		t.Fatalf("an unlinked telegram must never be deliverable, got %v", deliverable)
	}
	if !deliverable.Has(models.ChannelEmail) {
		t.Fatalf("a verified email must stay deliverable, got %v", deliverable)
	}
}

func TestRecipientChannelsWantedIgnoresAvailabilityUnlikeDeliverable(t *testing.T) {
	channels := models.RecipientChannels{
		TelegramLinked: false,
		EmailVerified:  false,
		Selected:       models.ChannelSet{models.ChannelTelegram},
		Preferences:    models.NotificationPreferences{},
	}

	wanted := channels.Wanted(models.NotificationRequired)
	if !wanted.Has(models.ChannelTelegram) {
		t.Fatalf("wanted must report the selected channel even when not yet linked, got %v", wanted)
	}
	if channels.Deliverable(models.NotificationRequired).Has(models.ChannelTelegram) {
		t.Fatalf("deliverable must not report an unavailable channel")
	}
}

func TestDefaultPreferencesEnableEveryOccasionAndChannel(t *testing.T) {
	defaults := models.DefaultPreferences()
	if len(defaults) != len(models.AllOccasions)*len(models.AllChannels) {
		t.Fatalf("expected one row per occasion and channel, got %d", len(defaults))
	}
	for _, pref := range defaults {
		if !pref.Enabled {
			t.Fatalf("upgrading must not mute anyone by default, occasion %s channel %s was off",
				pref.Occasion, pref.Channel)
		}
	}
}
