package logger

import (
	"log/slog"
	"math"
	"testing"
	"time"
)

func TestFormatDuration(t *testing.T) {
	cases := map[time.Duration]string{
		1500 * time.Millisecond: "1.50s",
		250 * time.Millisecond:  "250.0ms",
		1500 * time.Microsecond: "1.5ms",
		40 * time.Microsecond:   "40us",
		900 * time.Nanosecond:   "900ns",
	}
	for elapsed, want := range cases {
		if got := formatDuration(elapsed); got != want {
			t.Fatalf("formatDuration(%v) = %q, want %q", elapsed, got, want)
		}
	}
}

func TestFormatBytes(t *testing.T) {
	cases := map[int64]string{
		56:              "56B",
		1024:            "1.0KB",
		1536:            "1.5KB",
		1024 * 1024:     "1.0MB",
		3 * 1024 * 1024: "3.0MB",
	}
	for size, want := range cases {
		if got := formatBytes(size); got != want {
			t.Fatalf("formatBytes(%d) = %q, want %q", size, got, want)
		}
	}
}

func TestMillisValueFromFloatMatchesAccessLogShape(t *testing.T) {
	got := millisValue(slog.Float64Value(0.04).Resolve())
	if want := 40 * time.Microsecond; got != want {
		t.Fatalf("millisValue(0.04) = %v, want %v", got, want)
	}
}

func TestMillisValueAcrossKinds(t *testing.T) {
	cases := []struct {
		name  string
		value slog.Value
		want  time.Duration
	}{
		{"float", slog.Float64Value(250), 250 * time.Millisecond},
		{"int", slog.IntValue(12), 12 * time.Millisecond},
		{"duration", slog.DurationValue(7 * time.Second), 7 * time.Second},
		{"string", slog.StringValue("1.5"), 1500 * time.Microsecond},
		{"garbage", slog.StringValue("nope"), 0},
	}
	for _, tc := range cases {
		if got := millisValue(tc.value.Resolve()); got != tc.want {
			t.Fatalf("%s: millisValue = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestIntValueClampsOverflowingUint(t *testing.T) {
	if got := intValue(slog.Uint64Value(math.MaxUint64)); got != math.MaxInt64 {
		t.Fatalf("intValue(MaxUint64) = %d, want %d", got, int64(math.MaxInt64))
	}
}

func TestIntValueParsesStringAndFallsBackToZero(t *testing.T) {
	if got := intValue(slog.StringValue("404")); got != 404 {
		t.Fatalf("intValue(\"404\") = %d, want 404", got)
	}
	if got := intValue(slog.StringValue("x")); got != 0 {
		t.Fatalf("intValue(\"x\") = %d, want 0", got)
	}
}

func TestRenderValueQuotesUnsafeText(t *testing.T) {
	cases := map[string]string{
		"plain":       "plain",
		"two words":   `"two words"`,
		"":            `""`,
		"has\"quote":  `"has\"quote"`,
		"line\nbreak": `"line\nbreak"`,
		"tab\there":   `"tab\there"`,
	}
	for input, want := range cases {
		if got := renderValue(slog.StringValue(input)); got != want {
			t.Fatalf("renderValue(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestRenderValueFormatsDuration(t *testing.T) {
	if got := renderValue(slog.DurationValue(2 * time.Second)); got != "2.00s" {
		t.Fatalf("renderValue(2s) = %q, want %q", got, "2.00s")
	}
}

func TestIndentBlockIndentsEveryLine(t *testing.T) {
	got := indentBlock("first\nsecond\n")
	want := "    first\n    second"
	if got != want {
		t.Fatalf("indentBlock = %q, want %q", got, want)
	}
}
