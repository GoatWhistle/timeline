//go:build integration

package services_test

import (
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/services"
)

func (w *world) countAuditEntries() int {
	w.t.Helper()
	var count int
	if err := w.pool.QueryRow(w.ctx, `SELECT count(*) FROM audit_log`).Scan(&count); err != nil {
		w.t.Fatalf("counting audit entries: %v", err)
	}
	return count
}

func (w *world) addAuditEntry(age time.Duration) {
	w.t.Helper()
	w.exec(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, created_at)
		VALUES ($1, 'EVENT_UPDATED', 'event', $2, now() - $3::interval)`,
		w.UserID, w.EventID, age.String())
}

func TestRetentionDeletesAuditEntriesPastTheWindow(t *testing.T) {
	w := newWorld(t)
	retention := w.cfg.Retent.AuditLog

	w.addAuditEntry(retention + 48*time.Hour)
	w.addAuditEntry(retention + 24*time.Hour)
	w.addAuditEntry(retention / 2)

	if got := w.countAuditEntries(); got != 3 {
		t.Fatalf("expected three seeded audit entries, got %d", got)
	}

	r := newRig(t, w, newSender(), newSender())
	services.RunRetention(r.delivery, w.ctx)

	got := w.countAuditEntries()
	if got != 1 {
		t.Fatalf("expected retention to leave one audit entry inside the window, got %d", got)
	}
}
