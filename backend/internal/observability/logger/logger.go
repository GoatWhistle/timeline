package logger

import (
	"io"
	"log/slog"
	"os"
)

const (
	FormatJSON   = "json"
	FormatPretty = "pretty"
)

type Options struct {
	Level  slog.Level
	Format string
	Color  string
}

func New(opts Options) *slog.Logger {
	return NewWithWriter(os.Stdout, opts)
}

func NewWithWriter(out io.Writer, opts Options) *slog.Logger {
	if ResolveFormat(opts.Format) == FormatJSON {
		return slog.New(slog.NewJSONHandler(out, &slog.HandlerOptions{Level: opts.Level}))
	}
	return slog.New(NewPrettyHandler(out, PrettyOptions{
		Level: opts.Level,
		Color: resolveColor(opts.Color, out),
	}))
}

func ResolveFormat(format string) string {
	switch format {
	case FormatJSON:
		return FormatJSON
	case FormatPretty, "text", "console":
		return FormatPretty
	default:
		return FormatPretty
	}
}

func ParseLevel(level string) slog.Level {
	switch level {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func resolveColor(mode string, out io.Writer) bool {
	switch mode {
	case "never", "off", "false", "0":
		return false
	case "always", "on", "true", "1":
		return true
	}
	if os.Getenv("NO_COLOR") != "" {
		return false
	}
	return isTerminal(out)
}

func isTerminal(out io.Writer) bool {
	file, ok := out.(*os.File)
	if !ok {
		return false
	}
	info, err := file.Stat()
	if err != nil {
		return false
	}
	return info.Mode()&os.ModeCharDevice != 0
}
