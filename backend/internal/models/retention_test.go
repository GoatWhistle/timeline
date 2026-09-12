package models_test

import (
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestRetentionSettingsAutoArchiveEnabledOnlyWithADayCount(t *testing.T) {
	if (models.RetentionSettings{}).AutoArchiveEnabled() {
		t.Fatalf("a nil archive_after_days reported auto-archive as enabled")
	}
	days := 30
	if !(models.RetentionSettings{ArchiveAfterDays: &days}).AutoArchiveEnabled() {
		t.Fatalf("a set archive_after_days did not report auto-archive as enabled")
	}
}

func TestRetentionSettingsAutoPurgeEnabledOnlyWithAMonthCount(t *testing.T) {
	if (models.RetentionSettings{}).AutoPurgeEnabled() {
		t.Fatalf("a nil delete_archive_after_months reported auto-purge as enabled")
	}
	months := 24
	if !(models.RetentionSettings{DeleteArchiveAfterMonths: &months}).AutoPurgeEnabled() {
		t.Fatalf("a set delete_archive_after_months did not report auto-purge as enabled")
	}
}

func TestEventPurgeScheduledReflectsTheTimestamp(t *testing.T) {
	if (&models.Event{}).PurgeScheduled() {
		t.Fatalf("an event without purge_scheduled_at reported as scheduled")
	}
	at := time.Now().UTC()
	if !(&models.Event{PurgeScheduledAt: &at}).PurgeScheduled() {
		t.Fatalf("an event with purge_scheduled_at did not report as scheduled")
	}
}
