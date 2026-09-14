package retention

import (
	"context"
	"log/slog"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func systemActor() models.Actor { return models.Actor{} }

func (w *Worker) Start(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	w.runOnce(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.runOnce(ctx)
		}
	}
}

func (w *Worker) StartSessionSweep(ctx context.Context, interval time.Duration) {
	if w.sessions == nil {
		return
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	w.sweepOnce(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.sweepOnce(ctx)
		}
	}
}

func (w *Worker) sweepOnce(ctx context.Context) {
	revoked, err := w.sessions.RevokeIdle(ctx, w.now(), w.sessionBatch())
	if err != nil {
		slog.ErrorContext(ctx, "idle session sweep failed", "error", err)
		return
	}
	if revoked > 0 {
		slog.InfoContext(ctx, "idle sessions revoked", "sessions_revoked", revoked)
	}
}

func (w *Worker) runOnce(ctx context.Context) {
	result, err := w.Run(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "retention reconciliation failed", "error", err)
		return
	}
	if result.Archived+result.Marked+result.Purged > 0 {
		slog.InfoContext(ctx, "retention policy reconciled",
			"archived", result.Archived, "purge_marked", result.Marked, "purged", result.Purged)
	}
}
