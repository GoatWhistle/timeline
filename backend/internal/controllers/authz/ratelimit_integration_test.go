//go:build integration

package authz_test

import (
	"net/http"
	"testing"
)

func TestCatalogRateLimitIsEnforcedPerAccount(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	limit := s.cfg.RateLim.CatalogRequests
	if limit <= 0 {
		t.Fatalf("the fixture must configure a positive catalog limit, got %d", limit)
	}

	member := s.session(t, f.member)
	for attempt := 1; attempt <= limit; attempt++ {
		requireStatus(t, member.get("/catalog"), http.StatusOK, "a catalog read within the limit")
	}

	blocked := member.get("/catalog")
	requireStatus(t, blocked, http.StatusTooManyRequests, "a catalog read beyond the limit")
	if code := blocked.errorCode(t); code != "rate_limited" {
		t.Fatalf("the refusal carried the code %q instead of rate_limited: %s", code, blocked.Body)
	}

	other := s.session(t, f.outsider)
	requireStatus(t, other.get("/catalog"), http.StatusOK,
		"a different account after one exhausted its own budget")
}

func TestSignInAttemptsAreRateLimited(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	attempts := s.cfg.RateLim.LoginAttempts

	client := s.client(t)
	for attempt := 1; attempt <= attempts; attempt++ {
		resp := client.post("/auth/login",
			map[string]string{"email": f.member.Email, "password": "wrong-" + password})
		requireStatus(t, resp, http.StatusUnauthorized, "a failed sign-in within the limit")
	}

	blocked := client.post("/auth/login",
		map[string]string{"email": f.member.Email, "password": "wrong-" + password})
	requireStatus(t, blocked, http.StatusTooManyRequests, "a failed sign-in beyond the limit")

	correct := client.post("/auth/login",
		map[string]string{"email": f.member.Email, "password": password})
	requireStatus(t, correct, http.StatusTooManyRequests,
		"the correct password once the budget for the pair is exhausted")

	elsewhere := s.client(t)
	elsewhere.login(f.outsider.Email, password)
}

func TestSuccessfulSignInClearsTheAttemptBudget(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	attempts := s.cfg.RateLim.LoginAttempts

	client := s.client(t)
	for attempt := 1; attempt < attempts; attempt++ {
		resp := client.post("/auth/login",
			map[string]string{"email": f.member.Email, "password": "wrong-" + password})
		requireStatus(t, resp, http.StatusUnauthorized, "a failed sign-in within the limit")
	}

	client.login(f.member.Email, password)

	for attempt := 1; attempt < attempts; attempt++ {
		resp := client.post("/auth/login",
			map[string]string{"email": f.member.Email, "password": "wrong-" + password})
		requireStatus(t, resp, http.StatusUnauthorized,
			"a failed sign-in after the budget was cleared by a success")
	}
}
