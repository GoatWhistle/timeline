//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func liveSessions(s *support.Stack, t *testing.T, userID string) int {
	t.Helper()
	var count int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM sessions WHERE user_id = (SELECT id FROM users WHERE display_id = $1)
		   AND revoked_at IS NULL`, userID).
		Scan(&count); err != nil {
		t.Fatalf("counting the live sessions of %s: %v", userID, err)
	}
	return count
}

func liveSessionsInChain(s *support.Stack, t *testing.T, refreshTokenHash string) int {
	t.Helper()
	var count int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM sessions
		 WHERE family_id = (SELECT family_id FROM sessions WHERE refresh_token_hash = $1)
		   AND revoked_at IS NULL`, refreshTokenHash).
		Scan(&count); err != nil {
		t.Fatalf("counting the live sessions in the chain of %s: %v", refreshTokenHash, err)
	}
	return count
}

func retiredSessions(s *support.Stack, t *testing.T, userID string) int {
	t.Helper()
	var count int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM sessions WHERE user_id = (SELECT id FROM users WHERE display_id = $1)
		   AND revoked_at IS NOT NULL`, userID).
		Scan(&count); err != nil {
		t.Fatalf("counting the retired sessions of %s: %v", userID, err)
	}
	return count
}

func TestRefreshRotatesAndRetiresTheOldToken(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	first := member.Cookie(support.RefreshCookie)
	if first == "" {
		t.Fatal("signing in left no refresh cookie")
	}

	support.RequireStatus(t, member.Post("/auth/refresh", nil), http.StatusOK, "rotating the session")
	second := member.Cookie(support.RefreshCookie)
	if second == "" || second == first {
		t.Fatalf("the refresh token did not rotate: %q then %q", first, second)
	}
	support.RequireStatus(t, member.Get("/me"), http.StatusOK, "reading the profile after a rotation")

	replay := s.Client(t)
	replay.SetCookie(support.RefreshCookie, first)
	support.RequireStatus(t, replay.Post("/auth/refresh", nil), http.StatusUnauthorized,
		"replaying a retired refresh token")

	if retiredSessions(s, t, f.Member.ID) == 0 {
		t.Fatal("rotation did not retire the previous session row")
	}
}

func TestReplayedRefreshTokenTerminatesTheSessionChain(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	retired := member.Cookie(support.RefreshCookie)
	support.RequireStatus(t, member.Post("/auth/refresh", nil), http.StatusOK, "rotating the session")

	replay := s.Client(t)
	replay.SetCookie(support.RefreshCookie, retired)
	support.RequireStatus(t, replay.Post("/auth/refresh", nil), http.StatusUnauthorized,
		"replaying a retired refresh token")

	if live := liveSessionsInChain(s, t, crypto.HashSecret(retired)); live != 0 {
		t.Fatalf("replaying a retired refresh token left %d live session(s) in the chain: "+
			"the chain-termination required by specification section 3 did not persist", live)
	}
	support.RequireStatus(t, member.Post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing the legitimate branch after the chain was terminated")
}

func TestLogoutRetiresTheRefreshToken(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	token := member.Cookie(support.RefreshCookie)
	support.RequireStatus(t, member.Post("/auth/logout", nil), http.StatusOK, "signing out")

	replay := s.Client(t)
	replay.SetCookie(support.RefreshCookie, token)
	support.RequireStatus(t, replay.Post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing with a signed-out token")
}

func TestLogoutAllRetiresEveryRefreshToken(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	first := s.Session(t, f.Member)
	second := s.Session(t, f.Member)
	firstToken := first.Cookie(support.RefreshCookie)
	secondToken := second.Cookie(support.RefreshCookie)
	if firstToken == secondToken {
		t.Fatal("two sign-ins produced the same refresh token")
	}

	support.RequireStatus(t, first.Post("/auth/logout-all", nil), http.StatusOK, "signing out everywhere")

	for name, token := range map[string]string{"the caller": firstToken, "the other device": secondToken} {
		replay := s.Client(t)
		replay.SetCookie(support.RefreshCookie, token)
		support.RequireStatus(t, replay.Post("/auth/refresh", nil), http.StatusUnauthorized,
			"refreshing after logout-all for "+name)
	}
}

func TestDeactivationEndsAccessImmediately(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Get("/me"), http.StatusOK, "the member reads their profile")

	support.RequireStatus(t, f.AdminClient.Post("/admin/users/"+f.Member.ID+"/deactivate", nil),
		http.StatusOK, "deactivating the member")

	support.RequireStatus(t, member.Get("/me"), http.StatusForbidden,
		"a deactivated support.Account keeps using its access token")
	support.RequireStatus(t, member.Post("/auth/refresh", nil), http.StatusUnauthorized,
		"a deactivated support.Account refreshes its session")
	if live := liveSessions(s, t, f.Member.ID); live != 0 {
		t.Fatalf("deactivation left %d live session(s)", live)
	}
}

func TestRevokedSessionEndsRefreshButNotTheLiveAccessToken(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Get("/me"), http.StatusOK, "the member reads their profile")

	held := member.Cookie(support.AccessCookie)
	if held == "" {
		t.Fatal("signing in left no access cookie")
	}

	if _, err := s.DB().Pool().Exec(context.Background(),
		`UPDATE sessions SET revoked_at = now() WHERE user_id = (SELECT id FROM users WHERE display_id = $1)`, f.Member.ID); err != nil {
		t.Fatalf("revoking the sessions of %s: %v", f.Member.ID, err)
	}

	support.RequireStatus(t, member.Post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing with a revoked session")

	holder := s.Client(t)
	holder.SetCookie(support.AccessCookie, held)
	support.RequireStatus(t, holder.Get("/me"), http.StatusOK,
		"the outstanding access token during its remaining lifetime")

	if s.AccessTTL() > 15*time.Minute {
		t.Fatalf("the access token lifetime %s exceeds the 15 minutes "+
			"that bound the window a revoked session stays usable", s.AccessTTL())
	}
}

func TestDeletedAccountLosesAccessImmediately(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Get("/me"), http.StatusOK, "the member reads their profile")

	support.RequireStatus(t, f.AdminClient.Delete("/admin/users/"+f.Member.ID),
		http.StatusOK, "deleting the member")

	support.RequireStatus(t, member.Get("/me"), http.StatusForbidden,
		"a deleted support.Account keeps using its access token")
	if live := liveSessions(s, t, f.Member.ID); live != 0 {
		t.Fatalf("deletion left %d live session(s)", live)
	}
}

func TestRenamingAnotherAccountsSessionIsNotFound(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	outsider := s.Session(t, f.Outsider)
	victim := currentSession(t, sessions(member, t))

	for name, attacker := range map[string]*support.Client{"an outsider": outsider, "an administrator": f.AdminClient} {
		resp := attacker.Patch("/me/sessions/"+victim.ID, map[string]any{"label": "Taken over"})
		support.RequireStatus(t, resp, http.StatusNotFound, "renaming the member's session as "+name)
		if code := resp.ErrorCode(t); code != "not_found" {
			t.Fatalf("%s renaming a foreign session got code %q, expected not_found", name, code)
		}
	}

	listed := sessionByID(t, sessions(member, t), victim.ID)
	if listed.Label != nil {
		t.Fatalf("a foreign rename reached the member's session: %q", *listed.Label)
	}
}

func TestRenamingAnUnknownSessionIsNotFound(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	support.RequireStatus(t, member.Patch("/me/sessions/"+support.MissingSessID, map[string]any{"label": "Ghost"}),
		http.StatusNotFound, "renaming a session that does not exist")
	support.RequireStatus(t, member.Patch("/me/sessions/not-a-uuid", map[string]any{"label": "Ghost"}),
		http.StatusBadRequest, "renaming a session with a malformed identifier")
}

func TestRenamingRefusesAnEmptyRequestAndAnOversizedName(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	own := currentSession(t, sessions(member, t))
	path := "/me/sessions/" + own.ID

	support.RequireStatus(t, member.Patch(path, map[string]any{}), http.StatusBadRequest,
		"a request that names nothing and clears nothing")
	support.RequireStatus(t, member.Patch(path, map[string]any{"label": strings.Repeat("a", 65)}),
		http.StatusBadRequest, "a name longer than the column holds")

	listed := sessionByID(t, sessions(member, t), own.ID)
	if listed.Label != nil {
		t.Fatalf("a refused rename still named the session %q", *listed.Label)
	}
}
