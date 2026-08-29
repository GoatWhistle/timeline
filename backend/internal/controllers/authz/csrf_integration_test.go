//go:build integration

package authz_test

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
