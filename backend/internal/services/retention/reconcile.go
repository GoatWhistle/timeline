package retention

import (
	"context"
	"log/slog"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type Worker struct {
	events   EventStore
	sessions SessionStore
	archiver Archiver
	deleter  Deleter
	covers   CoverClearer
	audit    Recorder
	limits   Limits
	now      func() time.Time
}

type Limits struct {
	Batch        int
	SessionBatch int
}

func NewWorker(events EventStore, sessions SessionStore, archiver Archiver, deleter Deleter,
	covers CoverClearer, audit Recorder, limits Limits) *Worker {
	return &Worker{events: events, sessions: sessions, archiver: archiver, deleter: deleter,
		covers: covers, audit: audit, limits: limits, now: func() time.Time { return time.Now().UTC() }}
}

type ReconcileResult struct {
	Archived int
	Marked   int
	Purged   int
}

func (w *Worker) Run(ctx context.Context) (*ReconcileResult, error) {
	result := &ReconcileResult{}
	settings, err := w.events.GetRetentionSettings(ctx)
	if err != nil {
		return result, err
	}
	now := w.now()

	if settings.AutoArchiveEnabled() {
		cutoff := now.AddDate(0, 0, -*settings.ArchiveAfterDays)
		if err := w.autoArchive(ctx, cutoff, settings.DeleteCoversOnArchive, result); err != nil {
			return result, err
		}
	}
	if settings.AutoPurgeEnabled() {
		cutoff := now.AddDate(0, -*settings.DeleteArchiveAfterMonths, 0)
		if err := w.schedulePurge(ctx, cutoff, now, result); err != nil {
			return result, err
		}
	}
	if err := w.purgeDue(ctx, now, result); err != nil {
		return result, err
	}
	return result, nil
}

func (w *Worker) sessionBatch() int {
	if w.limits.SessionBatch <= 0 {
		return 500
	}
	return w.limits.SessionBatch
}

func (w *Worker) autoArchive(ctx context.Context, cutoff time.Time, clearCovers bool,
	result *ReconcileResult) error {
	ids, err := w.events.FinishedPublishedBefore(ctx, cutoff, w.batch())
	if err != nil {
		return err
	}
	for _, id := range ids {
		if _, err := w.archiver.Archive(ctx, systemActor(), id); err != nil {
			slog.ErrorContext(ctx, "auto-archive failed", "event_id", id, "error", err)
			continue
		}
		result.Archived++
		if clearCovers && w.covers != nil {
			if err := w.covers.ClearCoverForArchive(ctx, id); err != nil {
				slog.ErrorContext(ctx, "clearing cover after auto-archive failed", "event_id", id, "error", err)
			}
		}
	}
	return nil
}

func (w *Worker) schedulePurge(ctx context.Context, cutoff, purgeAt time.Time, result *ReconcileResult) error {
	ids, err := w.events.ArchivedWithoutPurgeBefore(ctx, cutoff, w.batch())
	if err != nil {
		return err
	}
	for _, id := range ids {
		before, err := w.events.GetForUpdate(ctx, id)
		if err != nil {
			slog.ErrorContext(ctx, "reading event before scheduling purge failed", "event_id", id, "error", err)
			continue
		}
		if _, err := w.events.SchedulePurge(ctx, id, purgeAt); err != nil {
			slog.ErrorContext(ctx, "scheduling purge failed", "event_id", id, "error", err)
			continue
		}
		if err := w.audit.Record(ctx, systemActor(), models.AuditEventPurgeSchedule, models.EntityEvent, id,
			map[string]any{"purge_scheduled_at": before.PurgeScheduledAt},
			map[string]any{"purge_scheduled_at": purgeAt}); err != nil {
			slog.ErrorContext(ctx, "recording purge schedule failed", "event_id", id, "error", err)
		}
		result.Marked++
	}
	return nil
}

func (w *Worker) purgeDue(ctx context.Context, now time.Time, result *ReconcileResult) error {
	ids, err := w.events.PurgeDueBefore(ctx, now, w.batch())
	if err != nil {
		return err
	}
	for _, id := range ids {
		if err := w.deleter.Delete(ctx, systemActor(), id); err != nil {
			slog.ErrorContext(ctx, "scheduled purge failed", "event_id", id, "error", err)
			continue
		}
		result.Purged++
	}
	return nil
}

func (w *Worker) batch() int {
	if w.limits.Batch <= 0 {
		return 200
	}
	return w.limits.Batch
}
