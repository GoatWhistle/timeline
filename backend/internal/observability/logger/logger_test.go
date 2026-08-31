package logger

import (
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestResolveFormat(t *testing.T) {
	cases := map[string]string{
		"json":     FormatJSON,
		"pretty":   FormatPretty,
		"text":     FormatPretty,
		"console":  FormatPretty,
		"":         FormatPretty,
		"nonsense": FormatPretty,
	}
	for input, want := range cases {
		if got := ResolveFormat(input); got != want {
			t.Fatalf("ResolveFormat(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestParseLevel(t *testing.T) {
	cases := map[string]slog.Level{
		"debug": slog.LevelDebug,
		"info":  slog.LevelInfo,
		"warn":  slog.LevelWarn,
		"error": slog.LevelError,
		"":      slog.LevelInfo,
		"loud":  slog.LevelInfo,
	}
	for input, want := range cases {
		if got := ParseLevel(input); got != want {
			t.Fatalf("ParseLevel(%q) = %v, want %v", input, got, want)
		}
	}
}

func TestJSONFormatStaysMachineReadable(t *testing.T) {
	buf := &strings.Builder{}
	log := NewWithWriter(buf, Options{Level: slog.LevelInfo, Format: "json"})
	log.Info("http", "status", 200, "path", "/healthz")

	var decoded map[string]any
	if err := json.Unmarshal([]byte(buf.String()), &decoded); err != nil {
		t.Fatalf("json format must stay parseable: %v (%q)", err, buf.String())
	}
	if decoded["msg"] != "http" || decoded["path"] != "/healthz" {
		t.Fatalf("unexpected json payload: %v", decoded)
	}
	if strings.Contains(buf.String(), "\033[") {
		t.Fatalf("json output must never carry ANSI: %q", buf.String())
	}
}

func TestPrettyFormatIsDefault(t *testing.T) {
	buf := &strings.Builder{}
	NewWithWriter(buf, Options{Level: slog.LevelInfo}).Info("started")

	if json.Valid([]byte(buf.String())) {
		t.Fatalf("default format must not be json: %q", buf.String())
	}
	if !strings.Contains(buf.String(), "started") {
		t.Fatalf("missing message: %q", buf.String())
	}
}

func TestColorIsOffForNonTerminalWriter(t *testing.T) {
	buf := &strings.Builder{}
	NewWithWriter(buf, Options{Level: slog.LevelInfo, Color: "auto"}).Error("boom")

	if strings.Contains(buf.String(), "\033[") {
		t.Fatalf("auto color must stay off for a non-terminal writer: %q", buf.String())
	}
}

func TestColorIsOffWhenRedirectedToFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "out.log")
	file, err := os.Create(path)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	defer file.Close()

	NewWithWriter(file, Options{Level: slog.LevelInfo, Color: "auto"}).Error("boom")

	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if strings.Contains(string(content), "\033[") {
		t.Fatalf("redirected output must stay clean: %q", string(content))
	}
}

func TestExplicitColorModes(t *testing.T) {
	for _, mode := range []string{"always", "on", "true", "1"} {
		buf := &strings.Builder{}
		NewWithWriter(buf, Options{Level: slog.LevelInfo, Color: mode}).Error("boom")
		if !strings.Contains(buf.String(), "\033[") {
			t.Fatalf("color %q must force ANSI on: %q", mode, buf.String())
		}
	}
	for _, mode := range []string{"never", "off", "false", "0"} {
		buf := &strings.Builder{}
		NewWithWriter(buf, Options{Level: slog.LevelInfo, Color: mode}).Error("boom")
		if strings.Contains(buf.String(), "\033[") {
			t.Fatalf("color %q must force ANSI off: %q", mode, buf.String())
		}
	}
}

func TestNoColorEnvDisablesAutoColor(t *testing.T) {
	t.Setenv("NO_COLOR", "1")
	if resolveColor("auto", os.Stdout) {
		t.Fatal("NO_COLOR must disable auto color")
	}
	if !resolveColor("always", os.Stdout) {
		t.Fatal("explicit always must win over NO_COLOR")
	}
}

func TestJSONFormatIgnoresColorRequest(t *testing.T) {
	buf := &strings.Builder{}
	NewWithWriter(buf, Options{Level: slog.LevelInfo, Format: "json", Color: "always"}).Error("boom")

	if strings.Contains(buf.String(), "\033[") {
		t.Fatalf("json must ignore color: %q", buf.String())
	}
}

func TestLevelIsHonouredByConstructor(t *testing.T) {
	buf := &strings.Builder{}
	log := NewWithWriter(buf, Options{Level: slog.LevelError, Format: "pretty"})
	log.Warn("hidden")
	if buf.Len() != 0 {
		t.Fatalf("warn must be filtered at error level: %q", buf.String())
	}
}
