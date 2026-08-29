//go:build integration

package authz_test

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
)

func TestOnlyTheHashOfTheTokenIsStored(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	secret := s.session(t, f.member).issueFeed(t)

	var hash string
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT token_hash FROM calendar_feed_tokens WHERE user_id = $1 AND revoked_at IS NULL`,
		f.member.ID).Scan(&hash); err != nil {
		t.Fatalf("reading the stored token: %v", err)
	}
	if hash == secret {
		t.Fatal("the raw token is stored in the database")
	}
	if strings.Contains(hash, secret) || strings.Contains(secret, hash) {
		t.Fatalf("the stored value %q is derived from the token by more than hashing", hash)
	}
	if want := crypto.HashSecret(secret); hash != want {
		t.Fatalf("the stored value is %q, expected the SHA-256 hash %q", hash, want)
	}

	var anywhere int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM calendar_feed_tokens WHERE token_hash = $1`, secret).Scan(&anywhere); err != nil {
		t.Fatalf("searching for the raw token: %v", err)
	}
	if anywhere != 0 {
		t.Fatalf("the raw token appears in %d rows of calendar_feed_tokens", anywhere)
	}

	var recorded int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM audit_log WHERE action = 'CALENDAR_FEED_ISSUE'`).Scan(&recorded); err != nil {
		t.Fatalf("reading the audit log: %v", err)
	}
	if recorded != 1 {
		t.Fatalf("issuing the feed produced %d audit entries, so the search below proves nothing", recorded)
	}

	var audits int
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM audit_log
		 WHERE coalesce(before_json::text, '') || coalesce(after_json::text, '') LIKE '%' || $1 || '%'
		    OR coalesce(before_json::text, '') || coalesce(after_json::text, '') LIKE '%' || $2 || '%'`,
		secret, hash).Scan(&audits); err != nil {
		t.Fatalf("searching the audit log: %v", err)
	}
	if audits != 0 {
		t.Fatalf("the audit log records the token or its hash in %d entries", audits)
	}
}

func TestFeedRateLimitAppliesWithoutAnAccountContext(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	secret := s.session(t, f.member).issueFeed(t)
	limit := s.cfg.RateLim.ICSRequests
	if limit <= 0 {
		t.Fatalf("the fixture must configure a positive feed limit, got %d", limit)
	}

	for attempt := 1; attempt <= limit; attempt++ {
		requireStatus(t, s.rawFeed(t, secret), http.StatusOK, "a feed read within the limit")
	}
	blocked := s.rawFeed(t, secret)
	requireStatus(t, blocked, http.StatusTooManyRequests, "a feed read beyond the limit")
	if code := blocked.errorCode(t); code != "rate_limited" {
		t.Fatalf("the refusal carried the code %q instead of rate_limited: %s", code, blocked.Body)
	}

	other, err := crypto.NewSecret()
	if err != nil {
		t.Fatalf("generating a second secret: %v", err)
	}
	requireStatus(t, s.rawFeed(t, other), http.StatusNotFound,
		"a different token once the first exhausted its own budget")
}
