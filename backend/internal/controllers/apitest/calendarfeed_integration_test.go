//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
)

func TestCalendarFeedIsIssuedOnceAndServesTheOwnersSchedule(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	before := member.get("/me/calendar-feed")
	requireStatus(t, before, http.StatusOK, "describing a feed that does not exist yet")
	if enabled := describeEnabled(t, before); enabled {
		t.Fatalf("a fresh account already reports an enabled feed: %s", before.Body)
	}

	secret := member.issueFeed(t)
	body := s.fetchFeed(t, secret, http.StatusOK)
	if !strings.Contains(body, "BEGIN:VCALENDAR") || !strings.Contains(body, "Member event") {
		t.Fatalf("the feed does not carry the owner's event: %s", body)
	}

	again := member.post("/me/calendar-feed", nil)
	requireStatus(t, again, http.StatusConflict, "issuing a second feed for the same account")
	if code := again.errorCode(t); code != "calendar_feed_exists" {
		t.Fatalf("the refusal carried the code %q instead of calendar_feed_exists: %s", code, again.Body)
	}

	after := member.get("/me/calendar-feed")
	requireStatus(t, after, http.StatusOK, "describing an issued feed")
	if enabled := describeEnabled(t, after); !enabled {
		t.Fatalf("an issued feed is reported as absent: %s", after.Body)
	}
	requireNoBodyField(t, after, "url", "describing an issued feed")
}

func TestRevokedTokenServesNothing(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	secret := member.issueFeed(t)
	s.fetchFeed(t, secret, http.StatusOK)

	requireStatus(t, member.delete("/me/calendar-feed"), http.StatusNoContent, "revoking the feed")
	s.requireFeedNotFound(t, secret, "a token revoked through DELETE")

	requireStatus(t, member.delete("/me/calendar-feed"), http.StatusNoContent,
		"revoking an already revoked feed")
	s.requireFeedNotFound(t, secret, "a token revoked twice")

	describe := member.get("/me/calendar-feed")
	requireStatus(t, describe, http.StatusOK, "describing a revoked feed")
	if enabled := describeEnabled(t, describe); enabled {
		t.Fatalf("a revoked feed is still reported as enabled: %s", describe.Body)
	}
}

func TestRotationRetiresThePreviousToken(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	first := member.issueFeed(t)
	s.fetchFeed(t, first, http.StatusOK)

	rotated := member.post("/me/calendar-feed/rotate", nil)
	requireStatus(t, rotated, http.StatusOK, "rotating the feed")
	second := secretFromResponse(t, rotated)
	if second == first {
		t.Fatal("rotation returned the same address")
	}

	s.requireFeedNotFound(t, first, "the address that rotation replaced")
	s.fetchFeed(t, second, http.StatusOK)

	if active := s.countActiveTokens(t, f.member.ID); active != 1 {
		t.Fatalf("after rotation the account holds %d active tokens instead of 1", active)
	}
}

func TestOneUsersTokenNeverReturnsAnotherUsersSchedule(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	memberSecret := s.session(t, f.member).issueFeed(t)
	outsiderSecret := s.session(t, f.outsider).issueFeed(t)

	memberFeed := s.fetchFeed(t, memberSecret, http.StatusOK)
	if !strings.Contains(memberFeed, "Member event") {
		t.Fatalf("the owner's feed lost their own event: %s", memberFeed)
	}
	if strings.Contains(memberFeed, "Foreign event") {
		t.Fatalf("the feed exposes an event the owner is not assigned to: %s", memberFeed)
	}
	if strings.Contains(memberFeed, "internal administrative note") {
		t.Fatalf("the feed exposes an administrative note: %s", memberFeed)
	}
	if strings.Contains(memberFeed, f.admin.Email) || strings.Contains(memberFeed, f.outsider.Email) {
		t.Fatalf("the feed names other people: %s", memberFeed)
	}

	outsiderFeed := s.fetchFeed(t, outsiderSecret, http.StatusOK)
	if strings.Contains(outsiderFeed, "Member event") {
		t.Fatalf("an unassigned account's feed carries someone else's event: %s", outsiderFeed)
	}
	if strings.Contains(outsiderFeed, "BEGIN:VEVENT") {
		t.Fatalf("an unassigned account's feed is not empty: %s", outsiderFeed)
	}
}

func TestDeactivatedOwnerGetsNotFoundRatherThanAnEmptyCalendar(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	secret := s.session(t, f.member).issueFeed(t)
	s.fetchFeed(t, secret, http.StatusOK)

	requireStatus(t, f.adminClient.post("/admin/users/"+f.member.ID.String()+"/deactivate", nil),
		http.StatusOK, "deactivating the owner")

	s.requireFeedNotFound(t, secret, "the feed of a deactivated account")
	if active := s.countActiveTokens(t, f.member.ID); active != 0 {
		t.Fatalf("deactivation left %d active tokens", active)
	}

	s.reviveToken(t, f.member.ID)
	if active := s.countActiveTokens(t, f.member.ID); active != 1 {
		t.Fatalf("the token was not revived, so the check below proves nothing")
	}
	s.requireFeedNotFound(t, secret, "a live token whose owner is deactivated")
}

func TestUnknownRevokedAndDeactivatedAreIndistinguishable(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	revokedOwner := s.session(t, f.member)
	revoked := revokedOwner.issueFeed(t)
	requireStatus(t, revokedOwner.delete("/me/calendar-feed"), http.StatusNoContent, "revoking the feed")

	deactivated := s.session(t, f.outsider).issueFeed(t)
	requireStatus(t, f.adminClient.post("/admin/users/"+f.outsider.ID.String()+"/deactivate", nil),
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
		resp := s.rawFeed(t, secret)
		requireStatus(t, resp, http.StatusNotFound, what)
		seen[what] = string(resp.Body)
	}

	var reference, referenceOf string
	for what, body := range seen {
		if reference == "" {
			reference, referenceOf = stripRequestID(t, body), what
			continue
		}
		if got := stripRequestID(t, body); got != reference {
			t.Fatalf("%s answers %s while %s answers %s: the response is an oracle "+
				"for whether the token ever existed", what, got, referenceOf, reference)
		}
	}
}

func (s *stack) countActiveTokens(t *testing.T, userID uuid.UUID) int {
	t.Helper()
	var count int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM calendar_feed_tokens WHERE user_id = $1 AND revoked_at IS NULL`,
		userID).Scan(&count); err != nil {
		t.Fatalf("counting active tokens: %v", err)
	}
	return count
}

func (s *stack) reviveToken(t *testing.T, userID uuid.UUID) {
	t.Helper()
	if _, err := s.db.Pool().Exec(context.Background(),
		`UPDATE calendar_feed_tokens SET revoked_at = NULL WHERE user_id = $1`, userID); err != nil {
		t.Fatalf("reviving the token: %v", err)
	}
}
