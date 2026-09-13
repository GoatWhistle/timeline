//go:build integration

package delivery_test

import (
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestPublishBackfillsNotificationForParticipantAssignedBeforePublication(t *testing.T) {
	w := newWorld(t)
	w.exec(`UPDATE events SET published_at = NULL WHERE id = $1`, w.EventID)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)

	before := r.reconcile()
	if before.Scanned != 0 {
		t.Fatalf("an unpublished event must not be a reconciliation candidate, scanned %d", before.Scanned)
	}
	if got := w.countAll(); got != 0 {
		t.Fatalf("expected no notifications before publication, got %d (%v)", got, w.keys())
	}

	w.exec(`UPDATE events SET published_at = now() WHERE id = $1`, w.EventID)

	published := r.reconcile()
	if published.Primary != 1 {
		t.Fatalf("publishing must backfill the primary notification for the already assigned participant, got %+v",
			published)
	}
	if got := w.countAll(); got != 1 {
		t.Fatalf("expected exactly one notification after publication, got %d (%v)", got, w.keys())
	}
	key := r.primaryKey(models.ChannelTelegram)
	if got := w.countByKey(key); got != 1 {
		t.Fatalf("expected exactly one row for %s, got %d", key, got)
	}

	again := r.reconcile()
	if again.Primary != 0 {
		t.Fatalf("reconciling an already backfilled event must not create a second notification, got %+v", again)
	}
	if got := w.countAll(); got != 1 {
		t.Fatalf("a repeated reconciliation duplicated notifications: %d (%v)", got, w.keys())
	}
	if got := w.countByKey(key); got != 1 {
		t.Fatalf("expected exactly one row for %s after a repeated pass, got %d", key, got)
	}
}
