package retention

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func adminActor() models.Actor { return models.Actor{UserID: uuid.New(), IsAdmin: true} }

func TestGetSettingsRequiresAdmin(t *testing.T) {
	svc := NewService(newFakeEventStore(), fakeUsers{}, &fakeRecorder{})
	if _, err := svc.GetSettings(context.Background(), models.Actor{}); err == nil {
		t.Fatal("a non-admin actor read the retention settings")
	}
}

func TestUpdateSettingsRejectsArchiveAfterDaysOutOfRange(t *testing.T) {
	svc := NewService(newFakeEventStore(), fakeUsers{}, &fakeRecorder{})
	_, err := svc.UpdateSettings(context.Background(), adminActor(),
		dto.UpdateRetentionSettingsRequest{ArchiveAfterDays: days(0)})
	if err == nil {
		t.Fatal("archive_after_days = 0 was accepted")
	}
	_, err = svc.UpdateSettings(context.Background(), adminActor(),
		dto.UpdateRetentionSettingsRequest{ArchiveAfterDays: days(3651)})
	if err == nil {
		t.Fatal("archive_after_days = 3651 was accepted")
	}
}

func TestUpdateSettingsRejectsDeleteArchiveAfterMonthsOutOfRange(t *testing.T) {
	svc := NewService(newFakeEventStore(), fakeUsers{}, &fakeRecorder{})
	_, err := svc.UpdateSettings(context.Background(), adminActor(),
		dto.UpdateRetentionSettingsRequest{DeleteArchiveAfterMonths: months(0)})
	if err == nil {
		t.Fatal("delete_archive_after_months = 0 was accepted")
	}
}

func TestUpdateSettingsPersistsAndRecordsAudit(t *testing.T) {
	store := newFakeEventStore()
	recorder := &fakeRecorder{}
	svc := NewService(store, fakeUsers{}, recorder)

	updated, err := svc.UpdateSettings(context.Background(), adminActor(),
		dto.UpdateRetentionSettingsRequest{
			ArchiveAfterDays:         days(14),
			DeleteArchiveAfterMonths: months(12),
		})
	if err != nil {
		t.Fatalf("a valid update was refused: %v", err)
	}
	if updated.ArchiveAfterDays == nil || *updated.ArchiveAfterDays != 14 {
		t.Fatalf("archive_after_days did not persist: %+v", updated)
	}
	if store.updateCalls != 1 {
		t.Fatalf("UpdateRetentionSettings called %d times, want 1", store.updateCalls)
	}
	if len(recorder.actions) != 1 || recorder.actions[0] != models.AuditRetentionChange {
		t.Fatalf("audit actions = %v, want exactly one RETENTION_SETTINGS_CHANGE", recorder.actions)
	}
}

func TestUpdateSettingsNilDisablesTheAutomaticStep(t *testing.T) {
	store := newFakeEventStore()
	store.settings = models.RetentionSettings{ArchiveAfterDays: days(30), AuditLogRetentionDays: 365}
	svc := NewService(store, fakeUsers{}, &fakeRecorder{})

	updated, err := svc.UpdateSettings(context.Background(), adminActor(),
		dto.UpdateRetentionSettingsRequest{ArchiveAfterDays: nil})
	if err != nil {
		t.Fatalf("clearing archive_after_days was refused: %v", err)
	}
	if updated.AutoArchiveEnabled() {
		t.Fatalf("archive_after_days stayed set after being cleared: %+v", updated)
	}
}

func TestCancelPurgeRequiresAScheduledPurge(t *testing.T) {
	store := newFakeEventStore()
	id := uuid.New()
	store.events[id] = &models.Event{ID: id, ArchivedAt: nowPtr()}
	svc := NewService(store, fakeUsers{}, &fakeRecorder{})

	if _, err := svc.CancelPurge(context.Background(), adminActor(), id); err == nil {
		t.Fatal("cancelling a purge that was never scheduled succeeded")
	}
}

func TestCancelPurgeClearsTheScheduledDate(t *testing.T) {
	store := newFakeEventStore()
	id := uuid.New()
	at := nowPtr()
	store.events[id] = &models.Event{ID: id, ArchivedAt: nowPtr(), PurgeScheduledAt: at}
	recorder := &fakeRecorder{}
	svc := NewService(store, fakeUsers{}, recorder)

	updated, err := svc.CancelPurge(context.Background(), adminActor(), id)
	if err != nil {
		t.Fatalf("cancelling a scheduled purge was refused: %v", err)
	}
	if updated.PurgeScheduled() {
		t.Fatalf("purge_scheduled_at survived cancellation: %+v", updated)
	}
	if !store.cancelledPurge[id] {
		t.Fatal("the store's CancelPurge was not called")
	}
	if len(recorder.actions) != 1 || recorder.actions[0] != models.AuditEventPurgeCancel {
		t.Fatalf("audit actions = %v, want exactly one EVENT_PURGE_CANCEL", recorder.actions)
	}
}

func TestCancelPurgeRequiresAdmin(t *testing.T) {
	store := newFakeEventStore()
	id := uuid.New()
	store.events[id] = &models.Event{ID: id, PurgeScheduledAt: nowPtr()}
	svc := NewService(store, fakeUsers{}, &fakeRecorder{})

	if _, err := svc.CancelPurge(context.Background(), models.Actor{}, id); err == nil {
		t.Fatal("a non-admin actor cancelled a scheduled purge")
	}
}
