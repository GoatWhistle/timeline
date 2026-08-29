//go:build integration

package authz_test

import (
	"bytes"
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

func TestTheTokenNeverReachesTheApplicationLog(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	secret := s.session(t, f.member).issueFeed(t)

	sink := captureLogs(t)
	s.fetchFeed(t, secret, http.StatusOK)
	revoked := s.session(t, f.member)
	requireStatus(t, revoked.delete("/me/calendar-feed"), http.StatusNoContent, "revoking the feed")
	s.requireFeedNotFound(t, secret, "a revoked token")
	requireStatus(t, s.rawFeed(t, "clearly-not-a-real-calendar-token"), http.StatusNotFound,
		"an unknown token")

	logs := sink.String()
	if logs == "" {
		t.Fatal("the request produced no log lines at all, so the check proves nothing")
	}
	if !strings.Contains(logs, "/api/v1/calendar/") {
		t.Fatalf("no feed request reached the log, so the check proves nothing: %s", logs)
	}
	if !strings.Contains(logs, "[redacted]") {
		t.Fatalf("the feed path was logged without redaction: %s", logs)
	}
	if strings.Contains(logs, secret) {
		t.Fatalf("the calendar token reached the application log: %s", logs)
	}
	if strings.Contains(logs, "clearly-not-a-real-calendar-token") {
		t.Fatalf("a rejected calendar token reached the application log: %s", logs)
	}
}

const panicSecret = "PanicRouteSecretValueThatMustNotBeLogged"

func TestAPanicOnTheFeedRouteStillRedactsTheToken(t *testing.T) {
	sink := captureLogs(t)
	handler := middleware.Recover(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("deliberate failure while serving a calendar feed")
	}))
	req := httptest.NewRequest(http.MethodGet,
		"/api/v1/calendar/"+panicSecret+"/feed.ics", nil)
	handler.ServeHTTP(httptest.NewRecorder(), req)

	logs := sink.String()
	if !strings.Contains(logs, "handler panic") {
		t.Fatalf("the panic was not logged, so the check proves nothing: %s", logs)
	}
	if strings.Contains(logs, panicSecret) {
		t.Fatalf("the panic log carries the calendar token: %s", logs)
	}
	if !strings.Contains(logs, "[redacted]") {
		t.Fatalf("the panic log did not redact the feed path: %s", logs)
	}
}
