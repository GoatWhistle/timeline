//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
)

type sessionItem struct {
	ID         uuid.UUID `json:"id"`
	UserAgent  *string   `json:"user_agent"`
	IP         *string   `json:"ip"`
	Current    bool      `json:"current"`
	CreatedAt  string    `json:"created_at"`
	LastUsedAt *string   `json:"last_used_at"`
	ExpiresAt  string    `json:"expires_at"`
}

func (c *client) sessions(t *testing.T) []sessionItem {
	t.Helper()
	resp := c.get("/me/sessions")
	requireStatus(t, resp, http.StatusOK, "listing own sessions")
	var body struct {
		Items []sessionItem `json:"items"`
	}
	resp.decode(t, &body)
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

func TestSessionListShowsOwnDevicesAndMarksTheCurrentOne(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	first := s.session(t, f.member)
	before := len(first.sessions(t))

	second := s.session(t, f.member)
	items := first.sessions(t)
	if len(items) != before+1 {
		t.Fatalf("one more sign-in moved the list from %d to %d session(s): %v", before, len(items), items)
	}

	current := currentSession(t, items)
	other := currentSession(t, second.sessions(t))
	if current.ID == other.ID {
		t.Fatal("both clients consider the same session current: the flag does not come from the access token")
	}

	for _, item := range items {
		if item.ExpiresAt == "" || item.CreatedAt == "" {
			t.Fatalf("session %s came back without its timestamps: %+v", item.ID, item)
		}
	}
}

func TestSessionListNeverExposesAnotherAccountsDevices(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	outsider := s.session(t, f.outsider)
	admin := f.adminClient

	memberIDs := make(map[uuid.UUID]bool)
	for _, item := range member.sessions(t) {
		memberIDs[item.ID] = true
	}
	if len(memberIDs) == 0 {
		t.Fatal("the member has no sessions to compare against")
	}

	for name, viewer := range map[string]*client{"an outsider": outsider, "an administrator": admin} {
		for _, item := range viewer.sessions(t) {
			if memberIDs[item.ID] {
				t.Fatalf("%s sees session %s belonging to the member", name, item.ID)
			}
		}
	}
}

func TestSessionListRequiresASession(t *testing.T) {
	s := newStack(t)
	s.seed(t)
	requireStatus(t, s.client(t).get("/me/sessions"), http.StatusUnauthorized,
		"listing sessions without signing in")
}

func TestRevokingOneSessionLeavesTheOtherDevicesSignedIn(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	keep := s.session(t, f.member)
	drop := s.session(t, f.member)
	doomed := currentSession(t, drop.sessions(t))

	requireStatus(t, keep.delete("/me/sessions/"+doomed.ID.String()), http.StatusOK,
		"revoking the other device")

	requireStatus(t, drop.post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing the revoked device")
	requireStatus(t, keep.post("/auth/refresh", nil), http.StatusOK,
		"refreshing the device that was kept")

	for _, item := range keep.sessions(t) {
		if item.ID == doomed.ID {
			t.Fatalf("the revoked session %s is still listed as active", doomed.ID)
		}
	}
}

func TestRevokingAnotherAccountsSessionIsNotFound(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	outsider := s.session(t, f.outsider)
	victim := currentSession(t, member.sessions(t))

	for name, attacker := range map[string]*client{"an outsider": outsider, "an administrator": f.adminClient} {
		resp := attacker.delete("/me/sessions/" + victim.ID.String())
		requireStatus(t, resp, http.StatusNotFound,
			"revoking the member's session as "+name)
		if code := resp.errorCode(t); code != "not_found" {
			t.Fatalf("%s revoking a foreign session got code %q, expected not_found", name, code)
		}
	}

	requireStatus(t, member.post("/auth/refresh", nil), http.StatusOK,
		"the member refreshes after the failed attempts on their session")
}

func TestRevokingAnUnknownSessionIsNotFound(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	requireStatus(t, member.delete("/me/sessions/"+uuid.NewString()), http.StatusNotFound,
		"revoking a session that does not exist")
	requireStatus(t, member.delete("/me/sessions/not-a-uuid"), http.StatusBadRequest,
		"revoking a session with a malformed identifier")
}

func TestRevokingTheCurrentSessionEndsItAndClearsTheCookies(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	other := s.session(t, f.member)
	own := currentSession(t, member.sessions(t))

	requireStatus(t, member.delete("/me/sessions/"+own.ID.String()), http.StatusOK,
		"revoking the caller's own session")
	if left := member.cookie(refreshCookie); left != "" {
		t.Fatalf("revoking the current session left the refresh cookie in place: %q", left)
	}

	requireStatus(t, member.post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing after revoking the current session")
	requireStatus(t, other.post("/auth/refresh", nil), http.StatusOK,
		"the other device stays signed in")
}

func TestRevokingAnAlreadyRevokedSessionSucceeds(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	keep := s.session(t, f.member)
	drop := s.session(t, f.member)
	doomed := currentSession(t, drop.sessions(t))

	path := "/me/sessions/" + doomed.ID.String()
	requireStatus(t, keep.delete(path), http.StatusOK, "revoking the other device")
	requireStatus(t, keep.delete(path), http.StatusOK, "revoking the same device again")
}
