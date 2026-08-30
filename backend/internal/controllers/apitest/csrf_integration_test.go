//go:build integration

package apitest_test

import (
	"net/http"
	"testing"
)

func TestMutatingRequestsRequireAMatchingCSRFToken(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)
	member.refreshCSRF()
	current := member.cookie(csrfCookie)
	if current == "" {
		t.Fatal("the CSRF endpoint issued no cookie")
	}

	body := map[string]any{"last_name": "Forged"}

	missing := member.do(http.MethodPatch, "/me", body, nil)
	requireStatus(t, missing, http.StatusForbidden, "a mutation without the CSRF header")

	empty := member.do(http.MethodPatch, "/me", body, map[string]string{csrfHeader: ""})
	requireStatus(t, empty, http.StatusForbidden, "a mutation with an empty CSRF header")

	mismatched := member.do(http.MethodPatch, "/me", body,
		map[string]string{csrfHeader: "0000000000000000000000000000000000000000"})
	requireStatus(t, mismatched, http.StatusForbidden, "a mutation with a mismatched CSRF header")

	member.refreshCSRF()
	stale := member.do(http.MethodPatch, "/me", body, map[string]string{csrfHeader: current})
	requireStatus(t, stale, http.StatusForbidden, "a mutation with a stale CSRF header")

	profile := member.get("/me")
	requireStatus(t, profile, http.StatusOK, "reading the profile after the refusals")
	if containsAll(string(profile.Body), "Forged") {
		t.Fatalf("a refused CSRF request changed the profile: %s", profile.Body)
	}

	accepted := member.do(http.MethodPatch, "/me", body,
		map[string]string{csrfHeader: member.cookie(csrfCookie)})
	requireStatus(t, accepted, http.StatusOK, "a mutation with the current CSRF header")
}

func TestCSRFTokenRotatesOnEveryIssue(t *testing.T) {
	s := newStack(t)
	client := s.client(t)

	seen := make(map[string]bool)
	for range 5 {
		client.refreshCSRF()
		token := client.cookie(csrfCookie)
		if token == "" {
			t.Fatal("the CSRF endpoint issued an empty token")
		}
		if seen[token] {
			t.Fatalf("the CSRF endpoint reissued the same token %q", token)
		}
		seen[token] = true
	}
}

func TestCSRFGuardsEveryMutatingMethodAndNotReads(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	for _, tc := range []struct {
		name   string
		method string
		path   string
		body   any
	}{
		{"POST", http.MethodPost, "/events/" + f.eventID.String() + "/registration/done", nil},
		{"PATCH", http.MethodPatch, "/me", map[string]any{"last_name": "Forged"}},
		{"DELETE", http.MethodDelete, "/me/telegram", nil},
	} {
		t.Run(tc.name, func(t *testing.T) {
			resp := member.do(tc.method, tc.path, tc.body, nil)
			requireStatus(t, resp, http.StatusForbidden, tc.name+" without a CSRF token")
		})
	}

	for _, path := range []string{"/me", "/me/events", "/catalog", "/events/" + f.eventID.String()} {
		t.Run("GET "+path, func(t *testing.T) {
			requireStatus(t, member.get(path), http.StatusOK, "a read of "+path)
		})
	}
}

func TestCSRFIsCheckedBeforeAuthenticationOnMutations(t *testing.T) {
	s := newStack(t)
	anonymous := s.client(t)

	resp := anonymous.do(http.MethodPost, "/auth/login",
		map[string]string{"email": "nobody@example.com", "password": password}, nil)
	requireStatus(t, resp, http.StatusForbidden, "signing in without a CSRF token")
}

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
