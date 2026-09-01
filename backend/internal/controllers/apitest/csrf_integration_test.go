//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestMutatingRequestsRequireAMatchingCSRFToken(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)
	member.RefreshCSRF()
	current := member.Cookie(support.CSRFCookie)
	if current == "" {
		t.Fatal("the CSRF endpoint issued no cookie")
	}

	body := map[string]any{"last_name": "Forged"}

	missing := member.Do(http.MethodPatch, "/me", body, nil)
	support.RequireStatus(t, missing, http.StatusForbidden, "a mutation without the CSRF header")

	empty := member.Do(http.MethodPatch, "/me", body, map[string]string{support.CSRFHeader: ""})
	support.RequireStatus(t, empty, http.StatusForbidden, "a mutation with an empty CSRF header")

	mismatched := member.Do(http.MethodPatch, "/me", body,
		map[string]string{support.CSRFHeader: "0000000000000000000000000000000000000000"})
	support.RequireStatus(t, mismatched, http.StatusForbidden, "a mutation with a mismatched CSRF header")

	member.RefreshCSRF()
	stale := member.Do(http.MethodPatch, "/me", body, map[string]string{support.CSRFHeader: current})
	support.RequireStatus(t, stale, http.StatusForbidden, "a mutation with a stale CSRF header")

	profile := member.Get("/me")
	support.RequireStatus(t, profile, http.StatusOK, "reading the profile after the refusals")
	if support.ContainsAll(string(profile.Body), "Forged") {
		t.Fatalf("a refused CSRF request changed the profile: %s", profile.Body)
	}

	accepted := member.Do(http.MethodPatch, "/me", body,
		map[string]string{support.CSRFHeader: member.Cookie(support.CSRFCookie)})
	support.RequireStatus(t, accepted, http.StatusOK, "a mutation with the current CSRF header")
}

func TestCSRFTokenRotatesOnEveryIssue(t *testing.T) {
	s := support.NewStack(t)
	client := s.Client(t)

	seen := make(map[string]bool)
	for range 5 {
		client.RefreshCSRF()
		token := client.Cookie(support.CSRFCookie)
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
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	for _, tc := range []struct {
		name   string
		method string
		path   string
		body   any
	}{
		{"POST", http.MethodPost, "/events/" + f.EventID + "/registration/done", nil},
		{"PATCH", http.MethodPatch, "/me", map[string]any{"last_name": "Forged"}},
		{"DELETE", http.MethodDelete, "/me/telegram", nil},
	} {
		t.Run(tc.name, func(t *testing.T) {
			resp := member.Do(tc.method, tc.path, tc.body, nil)
			support.RequireStatus(t, resp, http.StatusForbidden, tc.name+" without a CSRF token")
		})
	}

	for _, path := range []string{"/me", "/me/events", "/catalog", "/events/" + f.EventID} {
		t.Run("GET "+path, func(t *testing.T) {
			support.RequireStatus(t, member.Get(path), http.StatusOK, "a read of "+path)
		})
	}
}

func TestCSRFIsCheckedBeforeAuthenticationOnMutations(t *testing.T) {
	s := support.NewStack(t)
	anonymous := s.Client(t)

	resp := anonymous.Do(http.MethodPost, "/auth/login",
		map[string]string{"email": "nobody@example.com", "password": support.Password}, nil)
	support.RequireStatus(t, resp, http.StatusForbidden, "signing in without a CSRF token")
}

func TestCatalogRateLimitIsEnforcedPerAccount(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	limit := s.Config().RateLim.CatalogRequests
	if limit <= 0 {
		t.Fatalf("the support.Fixture must configure a positive catalog limit, got %d", limit)
	}

	member := s.Session(t, f.Member)
	for attempt := 1; attempt <= limit; attempt++ {
		support.RequireStatus(t, member.Get("/catalog"), http.StatusOK, "a catalog read within the limit")
	}

	blocked := member.Get("/catalog")
	support.RequireStatus(t, blocked, http.StatusTooManyRequests, "a catalog read beyond the limit")
	if code := blocked.ErrorCode(t); code != "rate_limited" {
		t.Fatalf("the refusal carried the code %q instead of rate_limited: %s", code, blocked.Body)
	}

	other := s.Session(t, f.Outsider)
	support.RequireStatus(t, other.Get("/catalog"), http.StatusOK,
		"a different support.Account after one exhausted its own budget")
}

func TestSignInAttemptsAreRateLimited(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	attempts := s.Config().RateLim.LoginAttempts

	client := s.Client(t)
	for attempt := 1; attempt <= attempts; attempt++ {
		resp := client.Post("/auth/login",
			map[string]string{"email": f.Member.Email, "password": "wrong-" + support.Password})
		support.RequireStatus(t, resp, http.StatusUnauthorized, "a failed sign-in within the limit")
	}

	blocked := client.Post("/auth/login",
		map[string]string{"email": f.Member.Email, "password": "wrong-" + support.Password})
	support.RequireStatus(t, blocked, http.StatusTooManyRequests, "a failed sign-in beyond the limit")

	correct := client.Post("/auth/login",
		map[string]string{"email": f.Member.Email, "password": support.Password})
	support.RequireStatus(t, correct, http.StatusTooManyRequests,
		"the correct support.Password once the budget for the pair is exhausted")

	elsewhere := s.Client(t)
	elsewhere.Login(f.Outsider.Email, support.Password)
}

func TestSuccessfulSignInClearsTheAttemptBudget(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	attempts := s.Config().RateLim.LoginAttempts

	client := s.Client(t)
	for attempt := 1; attempt < attempts; attempt++ {
		resp := client.Post("/auth/login",
			map[string]string{"email": f.Member.Email, "password": "wrong-" + support.Password})
		support.RequireStatus(t, resp, http.StatusUnauthorized, "a failed sign-in within the limit")
	}

	client.Login(f.Member.Email, support.Password)

	for attempt := 1; attempt < attempts; attempt++ {
		resp := client.Post("/auth/login",
			map[string]string{"email": f.Member.Email, "password": "wrong-" + support.Password})
		support.RequireStatus(t, resp, http.StatusUnauthorized,
			"a failed sign-in after the budget was cleared by a success")
	}
}
