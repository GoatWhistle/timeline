//go:build integration

package sessiontest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

const (
	deviceOne = "0123456789abcdef0123456789abcdef"
	deviceTwo = "fedcba9876543210fedcba9876543210"
)

type sessionItem struct {
	ID      string `json:"id"`
	Current bool   `json:"current"`
}

func sessions(c *support.Client, t *testing.T) []sessionItem {
	t.Helper()
	resp := c.Get("/me/sessions")
	support.RequireStatus(t, resp, http.StatusOK, "listing own sessions")
	var body struct {
		Items []sessionItem `json:"items"`
	}
	resp.Decode(t, &body)
	return body.Items
}

func currentSession(t *testing.T, items []sessionItem) sessionItem {
	t.Helper()
	var found []sessionItem
	for _, item := range items {
		if item.Current {
			found = append(found, item)
		}
	}
	if len(found) != 1 {
		t.Fatalf("expected exactly one session marked current, got %d of %d", len(found), len(items))
	}
	return found[0]
}

func signInFrom(s *support.Stack, t *testing.T, acc support.Account, device string) *support.Client {
	t.Helper()
	c := s.Client(t)
	c.SetCookie(support.DeviceCookie, device)
	c.Login(acc.Email, support.Password)
	return c
}

func TestSecondSignInFromTheSameDeviceReusesTheSessionRow(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	first := signInFrom(s, t, f.Member, deviceOne)
	opened := len(sessions(first, t))
	original := currentSession(t, sessions(first, t))

	second := signInFrom(s, t, f.Member, deviceOne)
	after := sessions(second, t)
	if len(after) != opened {
		t.Fatalf("a second sign-in from the same device moved the list from %d to %d session(s): %v",
			opened, len(after), after)
	}
	if reused := currentSession(t, after); reused.ID != original.ID {
		t.Fatalf("the same device opened session %s instead of reusing %s", reused.ID, original.ID)
	}
}

func TestSignInFromAnotherDeviceOpensItsOwnSession(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	laptop := signInFrom(s, t, f.Member, deviceOne)
	opened := len(sessions(laptop, t))

	phone := signInFrom(s, t, f.Member, deviceTwo)
	items := sessions(laptop, t)
	if len(items) != opened+1 {
		t.Fatalf("a second device moved the list from %d to %d session(s), want %d: %v",
			opened, len(items), opened+1, items)
	}
	onLaptop := currentSession(t, items)
	onPhone := currentSession(t, sessions(phone, t))
	if onLaptop.ID == onPhone.ID {
		t.Fatalf("two devices share session %s", onLaptop.ID)
	}
}

func TestSignInAfterLogoutReturnsToTheSameSessionRow(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	client := signInFrom(s, t, f.Member, deviceOne)
	before := currentSession(t, sessions(client, t))

	support.RequireStatus(t, client.Post("/auth/logout", nil), http.StatusOK, "signing out")
	if client.Cookie(support.DeviceCookie) == "" {
		t.Fatal("signing out cleared the device marker the next sign-in has to recognise")
	}

	back := signInFrom(s, t, f.Member, deviceOne)
	after := currentSession(t, sessions(back, t))
	if after.ID != before.ID {
		t.Fatalf("signing back in from the same browser opened session %s instead of returning to %s",
			after.ID, before.ID)
	}
}

func TestSignInWithoutADeviceMarkerStillOpensASession(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	client := s.Client(t)
	client.Login(f.Member.Email, support.Password)
	currentSession(t, sessions(client, t))
	if client.Cookie(support.DeviceCookie) == "" {
		t.Fatal("signing in left no device marker for the browser to reuse")
	}
}

func TestOneBrowserSigningIntoTwoAccountsKeepsTheSessionsApart(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := signInFrom(s, t, f.Member, deviceOne)
	outsider := signInFrom(s, t, f.Outsider, deviceOne)

	onMember := currentSession(t, sessions(member, t))
	onOutsider := currentSession(t, sessions(outsider, t))
	if onMember.ID == onOutsider.ID {
		t.Fatalf("two accounts sharing a browser landed on the same session %s", onMember.ID)
	}
}
