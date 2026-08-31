package logger

import (
	"log/slog"
	"testing"
	"time"
)

func TestLevelLabel(t *testing.T) {
	cases := map[slog.Level]string{
		slog.LevelDebug: "DEBUG",
		slog.LevelInfo:  "INFO",
		slog.LevelWarn:  "WARN",
		slog.LevelError: "ERROR",
	}
	for level, want := range cases {
		if got := levelLabel(level); got != want {
			t.Fatalf("levelLabel(%v) = %q, want %q", level, got, want)
		}
	}
}

func TestLevelLabelFitsPadding(t *testing.T) {
	for _, level := range []slog.Level{slog.LevelDebug, slog.LevelInfo, slog.LevelWarn, slog.LevelError} {
		if len(levelLabel(level)) > levelPadding {
			t.Fatalf("levelLabel(%v) = %q longer than padding %d", level, levelLabel(level), levelPadding)
		}
	}
}

func TestLevelColorDistinguishesSeverity(t *testing.T) {
	cases := map[slog.Level]string{
		slog.LevelDebug: ansiMagenta,
		slog.LevelInfo:  ansiGreen,
		slog.LevelWarn:  ansiYellow,
		slog.LevelError: ansiRed,
	}
	for level, want := range cases {
		if got := levelColor(level); got != want {
			t.Fatalf("levelColor(%v) = %q, want %q", level, got, want)
		}
	}
}

func TestStatusColor(t *testing.T) {
	cases := map[int]string{
		200: ansiGreen,
		204: ansiGreen,
		301: ansiCyan,
		404: ansiYellow,
		422: ansiYellow,
		500: ansiRed,
		503: ansiRed,
	}
	for status, want := range cases {
		if got := statusColor(status); got != want {
			t.Fatalf("statusColor(%d) = %q, want %q", status, got, want)
		}
	}
}

func TestDurationColor(t *testing.T) {
	cases := map[time.Duration]string{
		time.Millisecond:       ansiDim,
		99 * time.Millisecond:  ansiDim,
		100 * time.Millisecond: ansiYellow,
		499 * time.Millisecond: ansiYellow,
		500 * time.Millisecond: ansiRed,
		2 * time.Second:        ansiRed,
	}
	for elapsed, want := range cases {
		if got := durationColor(elapsed); got != want {
			t.Fatalf("durationColor(%v) = %q, want %q", elapsed, got, want)
		}
	}
}

func TestMethodColor(t *testing.T) {
	cases := map[string]string{
		"GET":     ansiBlue,
		"POST":    ansiGreen,
		"PUT":     ansiYellow,
		"PATCH":   ansiYellow,
		"DELETE":  ansiRed,
		"OPTIONS": ansiMagenta,
	}
	for method, want := range cases {
		if got := methodColor(method); got != want {
			t.Fatalf("methodColor(%q) = %q, want %q", method, got, want)
		}
	}
}
