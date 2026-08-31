package logger

import (
	"log/slog"
	"time"
)

const (
	ansiReset     = "\033[0m"
	ansiBold      = "\033[1m"
	ansiDim       = "\033[2m"
	ansiRed       = "\033[31m"
	ansiGreen     = "\033[32m"
	ansiYellow    = "\033[33m"
	ansiBlue      = "\033[34m"
	ansiMagenta   = "\033[35m"
	ansiCyan      = "\033[36m"
	ansiWhite     = "\033[37m"
	ansiBrightRed = "\033[91m"
)

const (
	statusRedirect  = 300
	statusClientErr = 400
	statusServerErr = 500
	slowRequest     = 500 * time.Millisecond
	mediumRequest   = 100 * time.Millisecond
)

const levelPadding = 5

func levelLabel(level slog.Level) string {
	switch {
	case level < slog.LevelInfo:
		return "DEBUG"
	case level < slog.LevelWarn:
		return "INFO"
	case level < slog.LevelError:
		return "WARN"
	default:
		return "ERROR"
	}
}

func levelColor(level slog.Level) string {
	switch {
	case level < slog.LevelInfo:
		return ansiMagenta
	case level < slog.LevelWarn:
		return ansiGreen
	case level < slog.LevelError:
		return ansiYellow
	default:
		return ansiRed
	}
}

func methodColor(method string) string {
	switch method {
	case "GET":
		return ansiBlue
	case "POST":
		return ansiGreen
	case "PUT", "PATCH":
		return ansiYellow
	case "DELETE":
		return ansiRed
	default:
		return ansiMagenta
	}
}

func statusColor(status int) string {
	switch {
	case status >= statusServerErr:
		return ansiRed
	case status >= statusClientErr:
		return ansiYellow
	case status >= statusRedirect:
		return ansiCyan
	default:
		return ansiGreen
	}
}

func durationColor(elapsed time.Duration) string {
	switch {
	case elapsed >= slowRequest:
		return ansiRed
	case elapsed >= mediumRequest:
		return ansiYellow
	default:
		return ansiDim
	}
}
