//go:build integration

package authz_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/coder/websocket"
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
