//go:build integration

package authz_test

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
)

func TestTheTokenStoreItselfHidesRevokedRows(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	ctx := context.Background()

	secret := s.session(t, f.member).issueFeed(t)
	hash := crypto.HashSecret(secret)

	found, err := s.calendar.GetActiveByHash(ctx, hash)
	if err != nil {
		t.Fatalf("looking up a live token: %v", err)
	}
	if found.UserID != f.member.ID {
		t.Fatalf("the lookup returned the token of %s instead of %s", found.UserID, f.member.ID)
	}

	if _, err := s.calendar.RevokeAllForUser(ctx, f.member.ID); err != nil {
		t.Fatalf("revoking the token: %v", err)
	}
	if _, err := s.calendar.GetActiveByHash(ctx, hash); !errors.Is(err, models.ErrNotFound) {
		t.Fatalf("the store still resolves a revoked hash, error was %v", err)
	}
	if _, err := s.calendar.GetActiveByUser(ctx, f.member.ID); !errors.Is(err, models.ErrNotFound) {
		t.Fatalf("the store still reports a revoked token as the account's active one, error was %v", err)
	}

	var revoked int
	if err := s.db.Pool().QueryRow(ctx,
		`SELECT count(*) FROM calendar_feed_tokens WHERE token_hash = $1 AND revoked_at IS NOT NULL`,
		hash).Scan(&revoked); err != nil {
		t.Fatalf("counting revoked rows: %v", err)
	}
	if revoked != 1 {
		t.Fatalf("revocation left %d revoked rows, so the lookups above prove nothing", revoked)
	}
}

func TestASecondActiveTokenCannotBeStored(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	ctx := context.Background()

	s.session(t, f.member).issueFeed(t)
	if _, err := s.calendar.Create(ctx, f.member.ID, strings.Repeat("f", 64)); err == nil {
		t.Fatal("the store accepted a second active token for one account")
	}

	if _, err := s.calendar.RevokeAllForUser(ctx, f.member.ID); err != nil {
		t.Fatalf("revoking the token: %v", err)
	}
	if _, err := s.calendar.Create(ctx, f.member.ID, strings.Repeat("f", 64)); err != nil {
		t.Fatalf("the store refused a replacement once the previous token was revoked: %v", err)
	}
}

func TestTheFeedRecordsWhenACalendarClientLastFetchedIt(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	secret := member.issueFeed(t)
	fresh := member.get("/me/calendar-feed")
	requireStatus(t, fresh, http.StatusOK, "describing a feed nobody fetched yet")
	if strings.Contains(string(fresh.Body), "last_used_at") {
		t.Fatalf("a feed nobody fetched already reports a last use: %s", fresh.Body)
	}

	s.fetchFeed(t, secret, http.StatusOK)

	used := member.get("/me/calendar-feed")
	requireStatus(t, used, http.StatusOK, "describing a fetched feed")
	if !strings.Contains(string(used.Body), "last_used_at") {
		t.Fatalf("fetching the feed did not record the last use: %s", used.Body)
	}
	requireNoBodyField(t, used, "url", "describing a fetched feed")
	requireNoBodyField(t, used, "token", "describing a fetched feed")
}
