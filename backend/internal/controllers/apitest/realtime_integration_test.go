//go:build integration

package apitest_test

import (
	"context"
	"github.com/coder/websocket"
	"net/http"
	"strings"
	"testing"
	"time"
)

func requireClosedByServer(t *testing.T, conn *websocket.Conn, within time.Duration) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), within)
	defer cancel()
	for {
		_, _, err := conn.Read(ctx)
		if err == nil {
			continue
		}
		if ctx.Err() != nil {
			t.Fatal("the socket stayed open: no close frame arrived before the deadline")
		}
		if websocket.CloseStatus(err) != websocket.StatusPolicyViolation {
			t.Fatalf("expected the server to close with a policy violation, got %v", err)
		}
		return
	}
}

func TestRealtimeDiesOnSessionRevocation(t *testing.T) {
	s := newStack(t)
	acc := s.register(t, "revoke-socket@example.com")
	c := s.session(t, acc)

	conn, _, err := dialRealtime(t, s, c, s.server.URL)
	if err != nil {
		t.Fatalf("opening the socket: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	var sessions struct {
		Items []struct {
			ID      string `json:"id"`
			Current bool   `json:"current"`
		} `json:"items"`
	}
	resp := c.get("/me/sessions")
	requireStatus(t, resp, http.StatusOK, "listing own sessions")
	resp.decode(t, &sessions)

	var current string
	for _, item := range sessions.Items {
		if item.Current {
			current = item.ID
		}
	}
	if current == "" {
		t.Fatal("the session list did not mark a current session")
	}

	if resp := c.delete("/me/sessions/" + current); resp.Status != http.StatusNoContent &&
		resp.Status != http.StatusOK {
		t.Fatalf("revoking the current session: status %d body %s", resp.Status, resp.Body)
	}

	requireClosedByServer(t, conn, 5*time.Second)
}

func TestRealtimeDiesOnLogout(t *testing.T) {
	s := newStack(t)
	acc := s.register(t, "logout-socket@example.com")
	c := s.session(t, acc)

	conn, _, err := dialRealtime(t, s, c, s.server.URL)
	if err != nil {
		t.Fatalf("opening the socket: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	requireStatus(t, c.post("/auth/logout", nil), http.StatusOK, "signing out")

	requireClosedByServer(t, conn, 5*time.Second)
}

func TestRealtimeDiesOnDeactivation(t *testing.T) {
	s := newStack(t)
	acc := s.register(t, "deactivate-socket@example.com")
	c := s.session(t, acc)

	conn, _, err := dialRealtime(t, s, c, s.server.URL)
	if err != nil {
		t.Fatalf("opening the socket: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	requireStatus(t, c.post("/me/deactivate", nil), http.StatusOK, "deactivating the account")

	requireClosedByServer(t, conn, 5*time.Second)
}

func wsURL(t *testing.T, s *stack) string {
	t.Helper()
	return strings.Replace(s.url("/realtime"), "http://", "ws://", 1)
}

func dialRealtime(t *testing.T, s *stack, c *client, origin string) (*websocket.Conn, *http.Response, error) {
	t.Helper()
	header := http.Header{}
	if origin != "" {
		header.Set("Origin", origin)
	}
	if token := c.cookie(accessCookie); token != "" {
		header.Set("Cookie", accessCookie+"="+token)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)
	return websocket.Dial(ctx, wsURL(t, s), &websocket.DialOptions{
		HTTPClient: &http.Client{Transport: s.transport()},
		HTTPHeader: header,
	})
}

func TestRealtimeRejectsForeignOrigin(t *testing.T) {
	s := newStack(t)
	acc := s.register(t, "origin-victim@example.com")
	c := s.session(t, acc)

	conn, resp, err := dialRealtime(t, s, c, "https://evil.example.com")
	if err == nil {
		_ = conn.CloseNow()
		t.Fatal("a socket was accepted with a foreign Origin: cross-site WebSocket hijacking is possible")
	}
	if resp == nil {
		t.Fatalf("expected an HTTP response describing the refusal, got error %v", err)
	}
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected the foreign origin to be refused with 403, got %d", resp.StatusCode)
	}
}

func TestRealtimeRejectsMissingOrigin(t *testing.T) {
	s := newStack(t)
	acc := s.register(t, "origin-absent@example.com")
	c := s.session(t, acc)

	conn, resp, err := dialRealtime(t, s, c, "")
	if err == nil {
		_ = conn.CloseNow()
		t.Fatal("a socket was accepted without an Origin header")
	}
	if resp == nil || resp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 without an Origin header, got %v (err %v)", resp, err)
	}
}

func TestRealtimeAcceptsSameOrigin(t *testing.T) {
	s := newStack(t)
	acc := s.register(t, "origin-same@example.com")
	c := s.session(t, acc)

	conn, _, err := dialRealtime(t, s, c, s.server.URL)
	if err != nil {
		t.Fatalf("the same-origin handshake was refused: %v", err)
	}
	defer func() { _ = conn.CloseNow() }()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	kind, body, err := conn.Read(ctx)
	if err != nil {
		t.Fatalf("reading the greeting frame: %v", err)
	}
	if kind != websocket.MessageText || !strings.Contains(string(body), `"hello"`) {
		t.Fatalf("expected a hello envelope, got %s", body)
	}
}

func TestRealtimeRefusesAnonymous(t *testing.T) {
	s := newStack(t)
	c := s.client(t)

	conn, resp, err := dialRealtime(t, s, c, s.server.URL)
	if err == nil {
		_ = conn.CloseNow()
		t.Fatal("an anonymous socket was accepted")
	}
	if resp == nil || resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 without a session, got %v (err %v)", resp, err)
	}
}
