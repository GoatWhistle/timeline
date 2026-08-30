//go:build integration

package apitest_test

import (
	"bytes"
	"encoding/json"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
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

func (c *client) issueFeed(t *testing.T) string {
	t.Helper()
	resp := c.post("/me/calendar-feed", nil)
	requireStatus(t, resp, http.StatusCreated, "issuing a calendar feed")
	return secretFromResponse(t, resp)
}

func secretFromResponse(t *testing.T, resp response) string {
	t.Helper()
	var body struct {
		URL string `json:"url"`
	}
	resp.decode(t, &body)
	const prefix, suffix = "/api/v1/calendar/", "/feed.ics"
	start := strings.Index(body.URL, prefix)
	if start < 0 || !strings.HasSuffix(body.URL, suffix) {
		t.Fatalf("the issued address %q does not have the documented shape", body.URL)
	}
	secret := body.URL[start+len(prefix) : len(body.URL)-len(suffix)]
	if secret == "" || strings.Contains(secret, "/") {
		t.Fatalf("the issued address %q carries no single-segment secret", body.URL)
	}
	return secret
}

func describeEnabled(t *testing.T, resp response) bool {
	t.Helper()
	var body struct {
		Enabled bool `json:"enabled"`
	}
	resp.decode(t, &body)
	return body.Enabled
}

func (s *stack) rawFeed(t *testing.T, secret string) response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, s.url("/calendar/"+secret+"/feed.ics"), nil)
	if err != nil {
		t.Fatalf("building the feed request: %v", err)
	}
	resp, err := s.server.Client().Do(req)
	if err != nil {
		t.Fatalf("fetching the feed: %v", err)
	}
	defer resp.Body.Close()
	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("reading the feed body: %v", err)
	}
	if len(resp.Cookies()) != 0 {
		t.Fatalf("the unauthenticated feed set cookies: %v", resp.Cookies())
	}
	return response{Status: resp.StatusCode, Body: payload}
}

func (s *stack) fetchFeed(t *testing.T, secret string, want int) string {
	t.Helper()
	resp := s.rawFeed(t, secret)
	requireStatus(t, resp, want, "fetching the calendar feed")
	return string(resp.Body)
}

func (s *stack) requireFeedNotFound(t *testing.T, secret, what string) {
	t.Helper()
	resp := s.rawFeed(t, secret)
	requireStatus(t, resp, http.StatusNotFound, what)
	if strings.Contains(string(resp.Body), "BEGIN:VCALENDAR") {
		t.Fatalf("%s still served an iCalendar document: %s", what, resp.Body)
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
