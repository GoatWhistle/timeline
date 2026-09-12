package retention

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestRunSkipsAutoArchiveWhenDisabled(t *testing.T) {
	store := newFakeEventStore()
	store.settings = models.RetentionSettings{AuditLogRetentionDays: 365}
	store.finishedPublished = []uuid.UUID{uuid.New()}
	archiver := &fakeArchiver{}
	worker := NewWorker(store, archiver, &fakeDeleter{}, &fakeCoverClearer{}, &fakeRecorder{}, Limits{})

	result, err := worker.Run(context.Background())
	if err != nil {
		t.Fatalf("Run returned an error: %v", err)
	}
	if result.Archived != 0 || len(archiver.archived) != 0 {
		t.Fatalf("auto-archive ran while disabled: %+v", result)
	}
}

func TestRunArchivesFinishedEventsWhenEnabled(t *testing.T) {
	store := newFakeEventStore()
	store.settings = models.RetentionSettings{ArchiveAfterDays: days(30), AuditLogRetentionDays: 365}
	id := uuid.New()
	store.finishedPublished = []uuid.UUID{id}
	archiver := &fakeArchiver{}
	worker := NewWorker(store, archiver, &fakeDeleter{}, &fakeCoverClearer{}, &fakeRecorder{}, Limits{})

	result, err := worker.Run(context.Background())
	if err != nil {
		t.Fatalf("Run returned an error: %v", err)
	}
	if result.Archived != 1 || len(archiver.archived) != 1 || archiver.archived[0] != id {
		t.Fatalf("the finished event was not auto-archived: %+v", result)
	}
}

func TestRunClearsCoversAfterArchiveOnlyWhenConfigured(t *testing.T) {
	store := newFakeEventStore()
	store.settings = models.RetentionSettings{
		ArchiveAfterDays: days(30), DeleteCoversOnArchive: true, AuditLogRetentionDays: 365,
	}
	id := uuid.New()
	store.finishedPublished = []uuid.UUID{id}
	covers := &fakeCoverClearer{}
	worker := NewWorker(store, &fakeArchiver{}, &fakeDeleter{}, covers, &fakeRecorder{}, Limits{})

	if _, err := worker.Run(context.Background()); err != nil {
		t.Fatalf("Run returned an error: %v", err)
	}
	if len(covers.cleared) != 1 || covers.cleared[0] != id {
		t.Fatalf("the cover was not cleared after auto-archive: %+v", covers.cleared)
	}
}

func TestRunLeavesCoversAloneWhenNotConfigured(t *testing.T) {
	store := newFakeEventStore()
	store.settings = models.RetentionSettings{ArchiveAfterDays: days(30), AuditLogRetentionDays: 365}
	store.finishedPublished = []uuid.UUID{uuid.New()}
	covers := &fakeCoverClearer{}
	worker := NewWorker(store, &fakeArchiver{}, &fakeDeleter{}, covers, &fakeRecorder{}, Limits{})

	if _, err := worker.Run(context.Background()); err != nil {
		t.Fatalf("Run returned an error: %v", err)
	}
	if len(covers.cleared) != 0 {
		t.Fatalf("the cover was cleared without delete_covers_on_archive: %+v", covers.cleared)
	}
}

func TestRunSchedulesPurgeInsteadOfDeletingDirectly(t *testing.T) {
	store := newFakeEventStore()
	store.settings = models.RetentionSettings{DeleteArchiveAfterMonths: months(6), AuditLogRetentionDays: 365}
	id := uuid.New()
	store.archivedNoPurge = []uuid.UUID{id}
	store.events[id] = &models.Event{ID: id, ArchivedAt: nowPtr()}
	deleter := &fakeDeleter{}
	worker := NewWorker(store, &fakeArchiver{}, deleter, &fakeCoverClearer{}, &fakeRecorder{}, Limits{})

	result, err := worker.Run(context.Background())
	if err != nil {
		t.Fatalf("Run returned an error: %v", err)
	}
	if result.Marked != 1 {
		t.Fatalf("result.Marked = %d, want 1", result.Marked)
	}
	if len(deleter.deleted) != 0 {
		t.Fatalf("scheduling a purge deleted the event immediately: %v", deleter.deleted)
	}
	if _, ok := store.scheduledPurgeAt[id]; !ok {
		t.Fatal("purge_scheduled_at was never set")
	}
}

func TestRunPurgesOnlyEventsPastTheirScheduledDate(t *testing.T) {
	store := newFakeEventStore()
	store.settings = models.RetentionSettings{AuditLogRetentionDays: 365}
	due := uuid.New()
	store.purgeDue = []uuid.UUID{due}
	deleter := &fakeDeleter{}
	worker := NewWorker(store, &fakeArchiver{}, deleter, &fakeCoverClearer{}, &fakeRecorder{}, Limits{})

	result, err := worker.Run(context.Background())
	if err != nil {
		t.Fatalf("Run returned an error: %v", err)
	}
	if result.Purged != 1 || len(deleter.deleted) != 1 || deleter.deleted[0] != due {
		t.Fatalf("the due event was not purged: %+v", result)
	}
}

func TestRunRecordsAuditForEveryScheduledPurge(t *testing.T) {
	store := newFakeEventStore()
	store.settings = models.RetentionSettings{DeleteArchiveAfterMonths: months(3), AuditLogRetentionDays: 365}
	id := uuid.New()
	store.archivedNoPurge = []uuid.UUID{id}
	store.events[id] = &models.Event{ID: id, ArchivedAt: nowPtr()}
	recorder := &fakeRecorder{}
	worker := NewWorker(store, &fakeArchiver{}, &fakeDeleter{}, &fakeCoverClearer{}, recorder, Limits{})

	if _, err := worker.Run(context.Background()); err != nil {
		t.Fatalf("Run returned an error: %v", err)
	}
	found := false
	for _, a := range recorder.actions {
		if a == models.AuditEventPurgeSchedule {
			found = true
		}
	}
	if !found {
		t.Fatalf("scheduling a purge did not record EVENT_PURGE_SCHEDULE: %v", recorder.actions)
	}
}

func TestBatchDefaultsWhenNotConfigured(t *testing.T) {
	worker := NewWorker(newFakeEventStore(), &fakeArchiver{}, &fakeDeleter{}, &fakeCoverClearer{},
		&fakeRecorder{}, Limits{Batch: 0})
	if worker.batch() != 200 {
		t.Fatalf("batch() = %d, want the 200 default", worker.batch())
	}
}
