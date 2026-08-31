package logger

import (
	"context"
	"log/slog"
	"strings"
	"testing"
	"time"
)

func newTestLogger(buf *strings.Builder, color bool) *slog.Logger {
	return slog.New(NewPrettyHandler(buf, PrettyOptions{Level: slog.LevelDebug, Color: color}))
}

func TestPrettyHandlerWritesHeaderAndAttrs(t *testing.T) {
	buf := &strings.Builder{}
	newTestLogger(buf, false).Info("worker started", "queue", "notifications")

	out := buf.String()
	if !strings.Contains(out, "INFO") {
		t.Fatalf("missing level in %q", out)
	}
	if !strings.Contains(out, "worker started") {
		t.Fatalf("missing message in %q", out)
	}
	if !strings.Contains(out, "queue=notifications") {
		t.Fatalf("missing attr in %q", out)
	}
	if !strings.HasSuffix(out, "\n") {
		t.Fatalf("record must end with newline: %q", out)
	}
}

func TestPrettyHandlerOmitsAnsiWhenColorDisabled(t *testing.T) {
	buf := &strings.Builder{}
	newTestLogger(buf, false).Error("boom", "error", "bad")

	if strings.Contains(buf.String(), "\033[") {
		t.Fatalf("color disabled but ANSI escape present: %q", buf.String())
	}
}

func TestPrettyHandlerEmitsAnsiWhenColorEnabled(t *testing.T) {
	buf := &strings.Builder{}
	newTestLogger(buf, true).Error("boom", "error", "bad")

	out := buf.String()
	if !strings.Contains(out, ansiRed) {
		t.Fatalf("error level should be red: %q", out)
	}
	if !strings.Contains(out, ansiBrightRed) {
		t.Fatalf("error attr should be bright red: %q", out)
	}
	if !strings.Contains(out, ansiReset) {
		t.Fatalf("color must be reset: %q", out)
	}
}

func TestPrettyHandlerRespectsLevel(t *testing.T) {
	buf := &strings.Builder{}
	log := slog.New(NewPrettyHandler(buf, PrettyOptions{Level: slog.LevelWarn, Color: false}))
	log.Info("hidden")
	if buf.Len() != 0 {
		t.Fatalf("info must be filtered at warn level: %q", buf.String())
	}
	log.Warn("shown")
	if !strings.Contains(buf.String(), "shown") {
		t.Fatalf("warn must pass at warn level: %q", buf.String())
	}
}

func TestPrettyHandlerDefaultsLevelToInfo(t *testing.T) {
	buf := &strings.Builder{}
	log := slog.New(NewPrettyHandler(buf, PrettyOptions{}))
	log.Debug("hidden")
	if buf.Len() != 0 {
		t.Fatalf("debug must be filtered by default: %q", buf.String())
	}
	log.Info("shown")
	if !strings.Contains(buf.String(), "shown") {
		t.Fatalf("info must pass by default: %q", buf.String())
	}
}

func TestPrettyHandlerKeepsWithAttrsAndGroups(t *testing.T) {
	buf := &strings.Builder{}
	log := newTestLogger(buf, false).With("service", "event-tracker").WithGroup("db")
	log.Info("connected", "pool", 8)

	out := buf.String()
	if !strings.Contains(out, "service=event-tracker") {
		t.Fatalf("missing base attr: %q", out)
	}
	if !strings.Contains(out, "db.pool=8") {
		t.Fatalf("group must qualify attr key: %q", out)
	}
}

func TestPrettyHandlerWithAttrsDoesNotLeakAcrossLoggers(t *testing.T) {
	buf := &strings.Builder{}
	base := newTestLogger(buf, false).With("service", "event-tracker")
	base.With("only", "first").Info("one")
	base.Info("two")

	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	if len(lines) != 2 {
		t.Fatalf("want 2 lines, got %d: %q", len(lines), buf.String())
	}
	if strings.Contains(lines[1], "only=first") {
		t.Fatalf("attr leaked into sibling logger: %q", lines[1])
	}
}

func TestPrettyHandlerRendersStackOnOwnLines(t *testing.T) {
	buf := &strings.Builder{}
	newTestLogger(buf, false).Error("panic recovered", "stack", "frame one\nframe two")

	out := buf.String()
	if !strings.Contains(out, "stack=\n    frame one\n    frame two") {
		t.Fatalf("stack must be indented on its own lines: %q", out)
	}
}

func TestPrettyHandlerUsesRecordTime(t *testing.T) {
	buf := &strings.Builder{}
	handler := NewPrettyHandler(buf, PrettyOptions{Level: slog.LevelDebug})
	stamp := time.Date(2026, 8, 31, 18, 57, 36, 416000000, time.UTC)
	rec := slog.NewRecord(stamp, slog.LevelInfo, "tick", 0)
	if err := handler.Handle(context.Background(), rec); err != nil {
		t.Fatalf("handle: %v", err)
	}
	if !strings.HasPrefix(buf.String(), "18:57:36.416 ") {
		t.Fatalf("record time must lead the line: %q", buf.String())
	}
}

func TestPrettyHandlerIsSafeForConcurrentUse(t *testing.T) {
	buf := &strings.Builder{}
	log := newTestLogger(buf, false)
	done := make(chan struct{})
	for i := 0; i < 8; i++ {
		go func() {
			defer func() { done <- struct{}{} }()
			for j := 0; j < 50; j++ {
				log.Info("tick", "n", j)
			}
		}()
	}
	for i := 0; i < 8; i++ {
		<-done
	}
	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	if len(lines) != 400 {
		t.Fatalf("want 400 intact lines, got %d", len(lines))
	}
}

func TestPrettyHandlerSiblingsDoNotOverwriteSharedAttrs(t *testing.T) {
	buf := &strings.Builder{}
	root := NewPrettyHandler(buf, PrettyOptions{Level: slog.LevelDebug})

	shared := make([]slog.Attr, 1, 4)
	shared[0] = slog.String("service", "event-tracker")
	base := root.WithAttrs(shared)

	first := base.WithAttrs([]slog.Attr{slog.String("branch", "first")})
	second := base.WithAttrs([]slog.Attr{slog.String("branch", "second")})

	emit := func(h slog.Handler, msg string) {
		if err := h.Handle(context.Background(), slog.NewRecord(time.Now(), slog.LevelInfo, msg, 0)); err != nil {
			t.Fatalf("handle: %v", err)
		}
	}
	emit(first, "one")
	emit(second, "two")

	lines := strings.Split(strings.TrimSpace(buf.String()), "\n")
	if len(lines) != 2 {
		t.Fatalf("want 2 lines, got %d: %q", len(lines), buf.String())
	}
	if !strings.Contains(lines[0], "branch=first") {
		t.Fatalf("first sibling lost its attr: %q", lines[0])
	}
	if !strings.Contains(lines[1], "branch=second") {
		t.Fatalf("second sibling lost its attr: %q", lines[1])
	}
}
