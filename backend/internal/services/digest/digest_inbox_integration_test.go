//go:build integration

package digest_test

import (
	"context"
	"testing"
	"time"
)

func (d *digestStack) inboxItems(t *testing.T, owner string) []string {
	t.Helper()
	rows, err := d.db.Pool().Query(context.Background(),
		`SELECT kind FROM inbox_items WHERE recipient_user_id = $1::uuid ORDER BY created_at`, owner)
	if err != nil {
		t.Fatalf("reading the inbox of %s: %v", owner, err)
	}
	defer rows.Close()
	var kinds []string
	for rows.Next() {
		var kind string
		if err := rows.Scan(&kind); err != nil {
			t.Fatalf("scanning an inbox row: %v", err)
		}
		kinds = append(kinds, kind)
	}
	return kinds
}

func TestWeeklyDigestAlsoLandsInTheInbox(t *testing.T) {
	d := newDigestStack(t)
	now := time.Now().UTC()

	owner := d.user(t, "Europe/Moscow")
	eventID := d.event(t, now.Add(-24*time.Hour), now.Add(30*24*time.Hour))
	d.task(t, owner, eventID, thisWeek(t, "Europe/Moscow"))

	if _, err := d.svc.Run(context.Background()); err != nil {
		t.Fatalf("running the digest pass: %v", err)
	}

	kinds := d.inboxItems(t, owner.String())
	if len(kinds) != 1 {
		t.Fatalf("a delivered digest left %d inbox items, want 1: %v", len(kinds), kinds)
	}
	if kinds[0] != "notification.digest" {
		t.Fatalf("the digest wrote the inbox kind %q, want notification.digest", kinds[0])
	}
}

func TestWeeklyDigestWritesTheInboxOnlyOncePerWeek(t *testing.T) {
	d := newDigestStack(t)
	now := time.Now().UTC()

	owner := d.user(t, "Europe/Moscow")
	eventID := d.event(t, now.Add(-24*time.Hour), now.Add(30*24*time.Hour))
	d.task(t, owner, eventID, thisWeek(t, "Europe/Moscow"))

	for i := 0; i < 3; i++ {
		if _, err := d.svc.Run(context.Background()); err != nil {
			t.Fatalf("digest pass %d: %v", i, err)
		}
	}

	if kinds := d.inboxItems(t, owner.String()); len(kinds) != 1 {
		t.Fatalf("three passes left %d inbox items, want 1: %v", len(kinds), kinds)
	}
}
