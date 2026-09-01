//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type sessionItem struct {
	ID         string  `json:"id"`
	UserAgent  *string `json:"user_agent"`
	IP         *string `json:"ip"`
	Label      *string `json:"label"`
	Current    bool    `json:"current"`
	CreatedAt  string  `json:"created_at"`
	LastUsedAt *string `json:"last_used_at"`
	ExpiresAt  string  `json:"expires_at"`
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

func TestSessionListShowsOwnDevicesAndMarksTheCurrentOne(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	first := s.Session(t, f.Member)
	before := len(sessions(first, t))

	second := s.Session(t, f.Member)
	items := sessions(first, t)
	if len(items) != before+1 {
		t.Fatalf("one more sign-in moved the list from %d to %d session(s): %v", before, len(items), items)
	}

	current := currentSession(t, items)
	other := currentSession(t, sessions(second, t))
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
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	outsider := s.Session(t, f.Outsider)
	admin := f.AdminClient

	memberIDs := make(map[string]bool)
	for _, item := range sessions(member, t) {
		memberIDs[item.ID] = true
	}
	if len(memberIDs) == 0 {
		t.Fatal("the member has no sessions to compare against")
	}

	for name, viewer := range map[string]*support.Client{"an outsider": outsider, "an administrator": admin} {
		for _, item := range sessions(viewer, t) {
			if memberIDs[item.ID] {
				t.Fatalf("%s sees session %s belonging to the member", name, item.ID)
			}
		}
	}
}

func TestSessionListRequiresASession(t *testing.T) {
	s := support.NewStack(t)
	s.Seed(t)
	support.RequireStatus(t, s.Client(t).Get("/me/sessions"), http.StatusUnauthorized,
		"listing sessions without signing in")
}

func TestRevokingOneSessionLeavesTheOtherDevicesSignedIn(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	keep := s.Session(t, f.Member)
	drop := s.Session(t, f.Member)
	doomed := currentSession(t, sessions(drop, t))

	support.RequireStatus(t, keep.Delete("/me/sessions/"+doomed.ID), http.StatusOK,
		"revoking the other device")

	support.RequireStatus(t, drop.Post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing the revoked device")
	support.RequireStatus(t, keep.Post("/auth/refresh", nil), http.StatusOK,
		"refreshing the device that was kept")

	for _, item := range sessions(keep, t) {
		if item.ID == doomed.ID {
			t.Fatalf("the revoked session %s is still listed as active", doomed.ID)
		}
	}
}

func TestRevokingAnotherAccountsSessionIsNotFound(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	outsider := s.Session(t, f.Outsider)
	victim := currentSession(t, sessions(member, t))

	for name, attacker := range map[string]*support.Client{"an outsider": outsider, "an administrator": f.AdminClient} {
		resp := attacker.Delete("/me/sessions/" + victim.ID)
		support.RequireStatus(t, resp, http.StatusNotFound,
			"revoking the member's session as "+name)
		if code := resp.ErrorCode(t); code != "not_found" {
			t.Fatalf("%s revoking a foreign session got code %q, expected not_found", name, code)
		}
	}

	support.RequireStatus(t, member.Post("/auth/refresh", nil), http.StatusOK,
		"the member refreshes after the failed attempts on their session")
}

func TestRevokingAnUnknownSessionIsNotFound(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	support.RequireStatus(t, member.Delete("/me/sessions/"+support.MissingSessID), http.StatusNotFound,
		"revoking a session that does not exist")
	support.RequireStatus(t, member.Delete("/me/sessions/not-a-uuid"), http.StatusBadRequest,
		"revoking a session with a malformed identifier")
}

func TestRevokingTheCurrentSessionEndsItAndClearsTheCookies(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	other := s.Session(t, f.Member)
	own := currentSession(t, sessions(member, t))

	support.RequireStatus(t, member.Delete("/me/sessions/"+own.ID), http.StatusOK,
		"revoking the caller's own session")
	if left := member.Cookie(support.RefreshCookie); left != "" {
		t.Fatalf("revoking the current session left the refresh cookie in place: %q", left)
	}

	support.RequireStatus(t, member.Post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing after revoking the current session")
	support.RequireStatus(t, other.Post("/auth/refresh", nil), http.StatusOK,
		"the other device stays signed in")
}

func TestRevokingAnAlreadyRevokedSessionSucceeds(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	keep := s.Session(t, f.Member)
	drop := s.Session(t, f.Member)
	doomed := currentSession(t, sessions(drop, t))

	path := "/me/sessions/" + doomed.ID
	support.RequireStatus(t, keep.Delete(path), http.StatusOK, "revoking the other device")
	support.RequireStatus(t, keep.Delete(path), http.StatusOK, "revoking the same device again")
}

func sessionByID(t *testing.T, items []sessionItem, id string) sessionItem {
	t.Helper()
	for _, item := range items {
		if item.ID == id {
			return item
		}
	}
	t.Fatalf("session %s is not listed among %d session(s)", id, len(items))
	return sessionItem{}
}

func TestNamingASessionSurvivesTheListing(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	own := currentSession(t, sessions(member, t))
	if own.Label != nil {
		t.Fatalf("a fresh session arrived already named %q", *own.Label)
	}

	resp := member.Patch("/me/sessions/"+own.ID, map[string]any{"label": "Work laptop"})
	support.RequireStatus(t, resp, http.StatusOK, "naming the caller's own session")

	var named sessionItem
	resp.Decode(t, &named)
	if named.Label == nil || *named.Label != "Work laptop" {
		t.Fatalf("the rename answered with label %v, want \"Work laptop\"", named.Label)
	}

	listed := sessionByID(t, sessions(member, t), own.ID)
	if listed.Label == nil || *listed.Label != "Work laptop" {
		t.Fatalf("the listing lost the name: %v", listed.Label)
	}

	support.RequireStatus(t, member.Post("/auth/refresh", nil), http.StatusOK,
		"refreshing after the rename: naming a session must not end it")
}

func TestClearingTheLabelLeavesTheSessionUnnamed(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	own := currentSession(t, sessions(member, t))

	support.RequireStatus(t, member.Patch("/me/sessions/"+own.ID, map[string]any{"label": "Work laptop"}),
		http.StatusOK, "naming the session")
	support.RequireStatus(t, member.Patch("/me/sessions/"+own.ID, map[string]any{"clear_label": true}),
		http.StatusOK, "clearing the name")

	listed := sessionByID(t, sessions(member, t), own.ID)
	if listed.Label != nil {
		t.Fatalf("the cleared session is still named %q", *listed.Label)
	}
}
