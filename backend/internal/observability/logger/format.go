package logger

import (
	"log/slog"
	"math"
	"strconv"
	"strings"
	"time"
)

const (
	unitKiB = 1024
	unitMiB = 1024 * 1024
)

func intValue(value slog.Value) int64 {
	switch value.Kind() {
	case slog.KindInt64:
		return value.Int64()
	case slog.KindUint64:
		unsigned := value.Uint64()
		if unsigned > math.MaxInt64 {
			return math.MaxInt64
		}
		return int64(unsigned)
	case slog.KindFloat64:
		return int64(value.Float64())
	case slog.KindDuration:
		return int64(value.Duration())
	default:
		parsed, err := strconv.ParseInt(value.String(), 10, 64)
		if err != nil {
			return 0
		}
		return parsed
	}
}

func millisValue(value slog.Value) time.Duration {
	switch value.Kind() {
	case slog.KindDuration:
		return value.Duration()
	case slog.KindFloat64:
		return time.Duration(value.Float64() * float64(time.Millisecond))
	case slog.KindInt64, slog.KindUint64:
		return time.Duration(intValue(value)) * time.Millisecond
	default:
		parsed, err := strconv.ParseFloat(value.String(), 64)
		if err != nil {
			return 0
		}
		return time.Duration(parsed * float64(time.Millisecond))
	}
}

func renderValue(value slog.Value) string {
	if value.Kind() == slog.KindDuration {
		return formatDuration(value.Duration())
	}
	text := value.String()
	if needsQuoting(text) {
		return strconv.Quote(text)
	}
	return text
}

func needsQuoting(text string) bool {
	if text == "" {
		return true
	}
	if strings.ContainsAny(text, " \t\"") {
		return true
	}
	for _, r := range text {
		if r < 0x20 || r == 0x7f {
			return true
		}
	}
	return false
}

func formatDuration(elapsed time.Duration) string {
	switch {
	case elapsed >= time.Second:
		return strconv.FormatFloat(elapsed.Seconds(), 'f', 2, 64) + "s"
	case elapsed >= time.Millisecond:
		return strconv.FormatFloat(float64(elapsed.Microseconds())/1000, 'f', 1, 64) + "ms"
	case elapsed >= time.Microsecond:
		return strconv.FormatInt(elapsed.Microseconds(), 10) + "us"
	default:
		return strconv.FormatInt(elapsed.Nanoseconds(), 10) + "ns"
	}
}

func formatBytes(size int64) string {
	switch {
	case size >= unitMiB:
		return strconv.FormatFloat(float64(size)/unitMiB, 'f', 1, 64) + "MB"
	case size >= unitKiB:
		return strconv.FormatFloat(float64(size)/unitKiB, 'f', 1, 64) + "KB"
	default:
		return strconv.FormatInt(size, 10) + "B"
	}
}

func indentBlock(text string) string {
	lines := strings.Split(strings.TrimRight(text, "\n"), "\n")
	for i, line := range lines {
		lines[i] = "    " + line
	}
	return strings.Join(lines, "\n")
}
