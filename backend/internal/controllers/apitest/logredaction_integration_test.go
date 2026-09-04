//go:build integration

package apitest_test

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
)

type logSink struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (l *logSink) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.buf.Write(p)
}

func (l *logSink) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.buf.String()
}

func captureLogs(t *testing.T) *logSink {
	t.Helper()
	sink := &logSink{}
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(sink, &slog.HandlerOptions{Level: slog.LevelDebug})))
	t.Cleanup(func() { slog.SetDefault(previous) })
	return sink
}

const panicSecret = "PanicRouteSecretValueThatMustNotBeLogged"

func TestAPanicOnASecretRouteStillRedactsTheToken(t *testing.T) {
	sink := captureLogs(t)
	handler := middleware.Recover(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("deliberate failure while serving a team join link")
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/team-join/"+panicSecret, nil)
	handler.ServeHTTP(httptest.NewRecorder(), req)

	logs := sink.String()
	if !strings.Contains(logs, "handler panic") {
		t.Fatalf("the panic was not logged, so the check proves nothing: %s", logs)
	}
	if strings.Contains(logs, panicSecret) {
		t.Fatalf("the panic log carries the join token: %s", logs)
	}
	if !strings.Contains(logs, "[redacted]") {
		t.Fatalf("the panic log did not redact the secret path: %s", logs)
	}
}

func stripRequestID(t *testing.T, body string) string {
	t.Helper()
	var parsed map[string]any
	if err := json.Unmarshal([]byte(body), &parsed); err != nil {
		t.Fatalf("decoding the refusal %s: %v", body, err)
	}
	if inner, ok := parsed["error"].(map[string]any); ok {
		delete(inner, "request_id")
	}
	normalised, err := json.Marshal(parsed)
	if err != nil {
		t.Fatalf("re-encoding the refusal: %v", err)
	}
	return string(normalised)
}
