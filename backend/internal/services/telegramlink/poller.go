package telegramlink

import (
	"context"
	"log/slog"
	"time"
)

type Source interface {
	DeleteWebhook(context.Context) error
	Updates(context.Context, int64) ([]Update, error)
}

func Run(ctx context.Context, source Source, completer Completer) {
	RunReplying(ctx, source, completer, nil)
}

func RunReplying(ctx context.Context, source Source, completer Completer, replier Replier) {
	RunWithRetry(ctx, "Telegram polling initialization", func(ctx context.Context) error {
		return source.DeleteWebhook(ctx)
	}, false)
	if ctx.Err() != nil {
		return
	}
	slog.InfoContext(ctx, "Telegram polling started")
	var offset int64
	connected := false
	RunWithRetry(ctx, "Telegram polling", func(ctx context.Context) error {
		updates, err := source.Updates(ctx, offset)
		if err != nil {
			connected = false
			return err
		}
		if !connected {
			slog.InfoContext(ctx, "Telegram polling connected")
			connected = true
		}
		for _, update := range updates {
			if update.ID < offset {
				continue
			}
			if err := HandleWithReply(ctx, completer, replier, update); err != nil {
				return err
			}
			offset = update.ID + 1
		}
		slog.DebugContext(ctx, "Telegram poll completed", "updates", len(updates))
		return nil
	}, true)
}

func RunWithRetry(ctx context.Context, operation string, run func(context.Context) error, repeat bool) {
	delay := time.Second
	for ctx.Err() == nil {
		if err := run(ctx); err != nil {
			if ctx.Err() != nil {
				return
			}
			slog.WarnContext(ctx, operation+" failed", "error", err, "retry_in", delay)
			if !wait(ctx, delay) {
				return
			}
			delay = min(2*delay, 30*time.Second)
			continue
		}
		if !repeat {
			return
		}
		delay = time.Second
	}
}

func wait(ctx context.Context, delay time.Duration) bool {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
