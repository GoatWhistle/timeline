//go:build integration

package authz_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"

	svcshared "github.com/GoatWhistle/timeline/internal/services/shared"
)

func (s *stack) liveSessions(t *testing.T, userID uuid.UUID) int {
	t.Helper()
	var count int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM sessions WHERE user_id = $1 AND revoked_at IS NULL`, userID).
		Scan(&count); err != nil {
		t.Fatalf("counting the live sessions of %s: %v", userID, err)
	}
	return count
}

func (s *stack) liveSessionsInChain(t *testing.T, refreshTokenHash string) int {
	t.Helper()
	var count int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM sessions
		 WHERE family_id = (SELECT family_id FROM sessions WHERE refresh_token_hash = $1)
		   AND revoked_at IS NULL`, refreshTokenHash).
		Scan(&count); err != nil {
		t.Fatalf("counting the live sessions in the chain of %s: %v", refreshTokenHash, err)
	}
	return count
}

func (s *stack) retiredSessions(t *testing.T, userID uuid.UUID) int {
	t.Helper()
	var count int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM sessions WHERE user_id = $1 AND revoked_at IS NOT NULL`, userID).
		Scan(&count); err != nil {
		t.Fatalf("counting the retired sessions of %s: %v", userID, err)
	}
	return count
}

func TestRefreshRotatesAndRetiresTheOldToken(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	first := member.cookie(refreshCookie)
	if first == "" {
		t.Fatal("signing in left no refresh cookie")
	}

	requireStatus(t, member.post("/auth/refresh", nil), http.StatusOK, "rotating the session")
	second := member.cookie(refreshCookie)
	if second == "" || second == first {
		t.Fatalf("the refresh token did not rotate: %q then %q", first, second)
	}
	requireStatus(t, member.get("/me"), http.StatusOK, "reading the profile after a rotation")

	replay := s.client(t)
	replay.setCookie(refreshCookie, first)
	requireStatus(t, replay.post("/auth/refresh", nil), http.StatusUnauthorized,
		"replaying a retired refresh token")

	if s.retiredSessions(t, f.member.ID) == 0 {
		t.Fatal("rotation did not retire the previous session row")
	}
}

func TestReplayedRefreshTokenTerminatesTheSessionChain(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	retired := member.cookie(refreshCookie)
	requireStatus(t, member.post("/auth/refresh", nil), http.StatusOK, "rotating the session")

	replay := s.client(t)
	replay.setCookie(refreshCookie, retired)
	requireStatus(t, replay.post("/auth/refresh", nil), http.StatusUnauthorized,
		"replaying a retired refresh token")

	if live := s.liveSessionsInChain(t, svcshared.HashSecret(retired)); live != 0 {
		t.Fatalf("replaying a retired refresh token left %d live session(s) in the chain: "+
			"the chain-termination required by specification section 3 did not persist", live)
	}
	requireStatus(t, member.post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing the legitimate branch after the chain was terminated")
}

func TestLogoutRetiresTheRefreshToken(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	token := member.cookie(refreshCookie)
	requireStatus(t, member.post("/auth/logout", nil), http.StatusOK, "signing out")

	replay := s.client(t)
	replay.setCookie(refreshCookie, token)
	requireStatus(t, replay.post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing with a signed-out token")
}

func TestLogoutAllRetiresEveryRefreshToken(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	first := s.session(t, f.member)
	second := s.session(t, f.member)
	firstToken := first.cookie(refreshCookie)
	secondToken := second.cookie(refreshCookie)
	if firstToken == secondToken {
		t.Fatal("two sign-ins produced the same refresh token")
	}

	requireStatus(t, first.post("/auth/logout-all", nil), http.StatusOK, "signing out everywhere")

	for name, token := range map[string]string{"the caller": firstToken, "the other device": secondToken} {
		replay := s.client(t)
		replay.setCookie(refreshCookie, token)
		requireStatus(t, replay.post("/auth/refresh", nil), http.StatusUnauthorized,
			"refreshing after logout-all for "+name)
	}
}

func TestDeactivationEndsAccessImmediately(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)
	requireStatus(t, member.get("/me"), http.StatusOK, "the member reads their profile")

	requireStatus(t, f.adminClient.post("/admin/users/"+f.member.ID.String()+"/deactivate", nil),
		http.StatusOK, "deactivating the member")

	requireStatus(t, member.get("/me"), http.StatusForbidden,
		"a deactivated account keeps using its access token")
	requireStatus(t, member.post("/auth/refresh", nil), http.StatusUnauthorized,
		"a deactivated account refreshes its session")
	if live := s.liveSessions(t, f.member.ID); live != 0 {
		t.Fatalf("deactivation left %d live session(s)", live)
	}
}

func TestRevokedSessionEndsRefreshButNotTheLiveAccessToken(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)
	requireStatus(t, member.get("/me"), http.StatusOK, "the member reads their profile")

	held := member.cookie(accessCookie)
	if held == "" {
		t.Fatal("signing in left no access cookie")
	}

	if _, err := s.db.Pool().Exec(context.Background(),
		`UPDATE sessions SET revoked_at = now() WHERE user_id = $1`, f.member.ID); err != nil {
		t.Fatalf("revoking the sessions of %s: %v", f.member.ID, err)
	}

	requireStatus(t, member.post("/auth/refresh", nil), http.StatusUnauthorized,
		"refreshing with a revoked session")

	holder := s.client(t)
	holder.setCookie(accessCookie, held)
	requireStatus(t, holder.get("/me"), http.StatusOK,
		"the outstanding access token during its remaining lifetime")

	if s.accessTTL() > 15*time.Minute {
		t.Fatalf("the access token lifetime %s exceeds the 15 minutes "+
			"that bound the window a revoked session stays usable", s.accessTTL())
	}
}

func TestDeletedAccountLosesAccessImmediately(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)
	requireStatus(t, member.get("/me"), http.StatusOK, "the member reads their profile")

	requireStatus(t, f.adminClient.delete("/admin/users/"+f.member.ID.String()),
		http.StatusOK, "deleting the member")

	requireStatus(t, member.get("/me"), http.StatusForbidden,
		"a deleted account keeps using its access token")
	if live := s.liveSessions(t, f.member.ID); live != 0 {
		t.Fatalf("deletion left %d live session(s)", live)
	}
}
