//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestCalendarFeedIsIssuedOnceAndServesTheOwnersSchedule(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	before := member.Get("/me/calendar-feed")
	support.RequireStatus(t, before, http.StatusOK, "describing a feed that does not exist yet")
	if enabled := describeEnabled(t, before); enabled {
		t.Fatalf("a fresh support.Account already reports an enabled feed: %s", before.Body)
	}

	secret := issueFeed(member, t)
	body := fetchFeed(s, t, secret, http.StatusOK)
	if !strings.Contains(body, "BEGIN:VCALENDAR") || !strings.Contains(body, "Member event") {
		t.Fatalf("the feed does not carry the owner's event: %s", body)
	}

	again := member.Post("/me/calendar-feed", nil)
	support.RequireStatus(t, again, http.StatusConflict, "issuing a second feed for the same support.Account")
	if code := again.ErrorCode(t); code != "calendar_feed_exists" {
		t.Fatalf("the refusal carried the code %q instead of calendar_feed_exists: %s", code, again.Body)
	}

	after := member.Get("/me/calendar-feed")
	support.RequireStatus(t, after, http.StatusOK, "describing an issued feed")
	if enabled := describeEnabled(t, after); !enabled {
		t.Fatalf("an issued feed is reported as absent: %s", after.Body)
	}
	support.RequireNoBodyField(t, after, "url", "describing an issued feed")
}

func TestRevokedTokenServesNothing(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	secret := issueFeed(member, t)
	fetchFeed(s, t, secret, http.StatusOK)

	support.RequireStatus(t, member.Delete("/me/calendar-feed"), http.StatusNoContent, "revoking the feed")
	requireFeedNotFound(s, t, secret, "a token revoked through DELETE")

	support.RequireStatus(t, member.Delete("/me/calendar-feed"), http.StatusNoContent,
		"revoking an already revoked feed")
	requireFeedNotFound(s, t, secret, "a token revoked twice")

	describe := member.Get("/me/calendar-feed")
	support.RequireStatus(t, describe, http.StatusOK, "describing a revoked feed")
	if enabled := describeEnabled(t, describe); enabled {
		t.Fatalf("a revoked feed is still reported as enabled: %s", describe.Body)
	}
}

func TestRotationRetiresThePreviousToken(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	first := issueFeed(member, t)
	fetchFeed(s, t, first, http.StatusOK)

	rotated := member.Post("/me/calendar-feed/rotate", nil)
	support.RequireStatus(t, rotated, http.StatusOK, "rotating the feed")
	second := secretFromResponse(t, rotated)
	if second == first {
		t.Fatal("rotation returned the same address")
	}

	requireFeedNotFound(s, t, first, "the address that rotation replaced")
	fetchFeed(s, t, second, http.StatusOK)

	if active := countActiveTokens(s, t, f.Member.ID); active != 1 {
		t.Fatalf("after rotation the support.Account holds %d active tokens instead of 1", active)
	}
}

func TestOneUsersTokenNeverReturnsAnotherUsersSchedule(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	memberSecret := issueFeed(s.Session(t, f.Member), t)
	outsiderSecret := issueFeed(s.Session(t, f.Outsider), t)

	memberFeed := fetchFeed(s, t, memberSecret, http.StatusOK)
	if !strings.Contains(memberFeed, "Member event") {
		t.Fatalf("the owner's feed lost their own event: %s", memberFeed)
	}
	if strings.Contains(memberFeed, "Foreign event") {
		t.Fatalf("the feed exposes an event the owner is not assigned to: %s", memberFeed)
	}
	if strings.Contains(memberFeed, "internal administrative note") {
		t.Fatalf("the feed exposes an administrative note: %s", memberFeed)
	}
	if strings.Contains(memberFeed, f.Admin.Email) || strings.Contains(memberFeed, f.Outsider.Email) {
		t.Fatalf("the feed names other people: %s", memberFeed)
	}

	outsiderFeed := fetchFeed(s, t, outsiderSecret, http.StatusOK)
	if strings.Contains(outsiderFeed, "Member event") {
		t.Fatalf("an unassigned support.Account's feed carries someone else's event: %s", outsiderFeed)
	}
	if strings.Contains(outsiderFeed, "BEGIN:VEVENT") {
		t.Fatalf("an unassigned support.Account's feed is not empty: %s", outsiderFeed)
	}
}

func TestDeactivatedOwnerGetsNotFoundRatherThanAnEmptyCalendar(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	secret := issueFeed(s.Session(t, f.Member), t)
	fetchFeed(s, t, secret, http.StatusOK)

	support.RequireStatus(t, f.AdminClient.Post("/admin/users/"+f.Member.ID+"/deactivate", nil),
		http.StatusOK, "deactivating the owner")

	requireFeedNotFound(s, t, secret, "the feed of a deactivated support.Account")
	if active := countActiveTokens(s, t, f.Member.ID); active != 0 {
		t.Fatalf("deactivation left %d active tokens", active)
	}

	reviveToken(s, t, f.Member.ID)
	if active := countActiveTokens(s, t, f.Member.ID); active != 1 {
		t.Fatalf("the token was not revived, so the check below proves nothing")
	}
	requireFeedNotFound(s, t, secret, "a live token whose owner is deactivated")
}

func TestUnknownRevokedAndDeactivatedAreIndistinguishable(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	revokedOwner := s.Session(t, f.Member)
	revoked := issueFeed(revokedOwner, t)
	support.RequireStatus(t, revokedOwner.Delete("/me/calendar-feed"), http.StatusNoContent, "revoking the feed")

	deactivated := issueFeed(s.Session(t, f.Outsider), t)
	support.RequireStatus(t, f.AdminClient.Post("/admin/users/"+f.Outsider.ID+"/deactivate", nil),
		http.StatusOK, "deactivating the outsider")

	unknown, err := crypto.NewSecret()
	if err != nil {
		t.Fatalf("generating an unknown secret: %v", err)
	}

	shapes := map[string]string{
		"a token that never existed": unknown,
		"a revoked token":            revoked,
		"a deactivated owner":        deactivated,
		"a malformed token":          "short",
	}
	seen := make(map[string]string, len(shapes))
	for what, secret := range shapes {
		resp := rawFeed(s, t, secret)
		support.RequireStatus(t, resp, http.StatusNotFound, what)
		seen[what] = string(resp.Body)
	}

	var reference, referenceOf string
	for what, body := range seen {
		if reference == "" {
			reference, referenceOf = stripRequestID(t, body), what
			continue
		}
		if got := stripRequestID(t, body); got != reference {
			t.Fatalf("%s answers %s while %s answers %s: the support.Response is an oracle "+
				"for whether the token ever existed", what, got, referenceOf, reference)
		}
	}
}

func countActiveTokens(s *support.Stack, t *testing.T, userID string) int {
	t.Helper()
	var count int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM calendar_feed_tokens
		 WHERE user_id = (SELECT id FROM users WHERE display_id = $1) AND revoked_at IS NULL`,
		userID).Scan(&count); err != nil {
		t.Fatalf("counting active tokens: %v", err)
	}
	return count
}

func reviveToken(s *support.Stack, t *testing.T, userID string) {
	t.Helper()
	if _, err := s.DB().Pool().Exec(context.Background(),
		`UPDATE calendar_feed_tokens SET revoked_at = NULL
		 WHERE user_id = (SELECT id FROM users WHERE display_id = $1)`, userID); err != nil {
		t.Fatalf("reviving the token: %v", err)
	}
}
