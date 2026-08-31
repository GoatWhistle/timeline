package logger

import (
	"log/slog"
	"strings"
	"testing"
)

func logAccess(buf *strings.Builder, color bool, args ...any) string {
	newTestLogger(buf, color).Info(accessLogMessage, args...)
	return buf.String()
}

func TestAccessLogRendersRequestLine(t *testing.T) {
	buf := &strings.Builder{}
	out := logAccess(buf, false,
		"method", "GET",
		"path", "/healthz",
		"status", 200,
		"bytes", 56,
		"duration_ms", 0.04,
		"request_id", "b8e6d099-1234-5678-9abc-def012345678",
		"ip", "[::1]")

	for _, want := range []string{"GET", "/healthz", "200", "40us", "56B", "#12345678", "from [::1]"} {
		if !strings.Contains(out, want) {
			t.Fatalf("missing %q in %q", want, out)
		}
	}
}

func TestAccessLogDoesNotRepeatFieldsAsKeyValues(t *testing.T) {
	buf := &strings.Builder{}
	out := logAccess(buf, false,
		"method", "GET", "path", "/healthz", "status", 200,
		"bytes", 56, "duration_ms", 0.04, "request_id", "abc", "ip", "127.0.0.1")

	for _, key := range accessLogKeys {
		if strings.Contains(out, key+"=") {
			t.Fatalf("access field %q rendered twice in %q", key, out)
		}
	}
}

func TestAccessLogKeepsUnknownAttrs(t *testing.T) {
	buf := &strings.Builder{}
	out := logAccess(buf, false,
		"method", "GET", "path", "/healthz", "status", 200, "user_id", "u-1")

	if !strings.Contains(out, "user_id=u-1") {
		t.Fatalf("non-access attr must survive: %q", out)
	}
}

func TestAccessLogColorsStatusAndDuration(t *testing.T) {
	buf := &strings.Builder{}
	out := logAccess(buf, true,
		"method", "POST", "path", "/api/v1/events", "status", 500, "duration_ms", 900.0)

	if !strings.Contains(out, ansiRed+ansiBold+"500") {
		t.Fatalf("5xx must be bold red: %q", out)
	}
	if !strings.Contains(out, ansiRed+"900.0ms") {
		t.Fatalf("slow request must be red: %q", out)
	}
	if !strings.Contains(out, ansiGreen+ansiBold+"POST  ") {
		t.Fatalf("POST must be green and padded: %q", out)
	}
}

func TestAccessLogRendersPathVerbatimSoScrubbingSurvives(t *testing.T) {
	buf := &strings.Builder{}
	out := logAccess(buf, false,
		"method", "GET", "path", "/api/v1/calendar/[redacted]/feed.ics", "status", 200)

	if !strings.Contains(out, "/api/v1/calendar/[redacted]/feed.ics") {
		t.Fatalf("scrubbed path must pass through unchanged: %q", out)
	}
}

func TestAccessLogToleratesMissingOptionalFields(t *testing.T) {
	buf := &strings.Builder{}
	out := logAccess(buf, false, "method", "GET", "path", "/healthz", "status", 200)

	if strings.Contains(out, "#") || strings.Contains(out, "from ") {
		t.Fatalf("absent optional fields must not render: %q", out)
	}
}

func TestAccessLogSkipsEmptyRequestIDAndIP(t *testing.T) {
	buf := &strings.Builder{}
	out := logAccess(buf, false,
		"method", "GET", "path", "/healthz", "status", 200, "request_id", "", "ip", "")

	if strings.Contains(out, "#") || strings.Contains(out, "from ") {
		t.Fatalf("empty optional fields must not render: %q", out)
	}
}

func TestShortRequestID(t *testing.T) {
	cases := map[string]string{
		"b8e6d099-1234-5678-9abc-def012345678": "12345678",
		"short":                                "short",
		"prefix/abcdefghijkl":                  "efghijkl",
	}
	for input, want := range cases {
		if got := shortRequestID(input); got != want {
			t.Fatalf("shortRequestID(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestNonAccessMessageKeepsPlainAttrs(t *testing.T) {
	buf := &strings.Builder{}
	newTestLogger(buf, false).Info("migration applied", "status", 200, "method", "GET")

	out := buf.String()
	if !strings.Contains(out, "status=200") || !strings.Contains(out, "method=GET") {
		t.Fatalf("only the access message gets special rendering: %q", out)
	}
}

func TestAccessLogHandlesStringStatus(t *testing.T) {
	buf := &strings.Builder{}
	out := logAccess(buf, false, "method", "GET", "path", "/x", "status", slog.StringValue("404"))

	if !strings.Contains(out, "404") {
		t.Fatalf("string status must render: %q", out)
	}
}
