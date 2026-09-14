//go:build integration

package delivery_test

import (
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
	svcdelivery "github.com/GoatWhistle/timeline/internal/services/delivery"
)

func TestActivationVersionBumpProducesNewPrimaryKey(t *testing.T) {
	w := newWorld(t)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()
	firstKey := r.primaryKey(models.ChannelTelegram)

	w.exec(`UPDATE registrations SET state = 'DISABLED' WHERE id = $1`, w.RegistrationID)
	if err := r.notifier.CancelForRegistration(w.ctx, w.RegistrationID); err != nil {
		t.Fatalf("cancelling on disable: %v", err)
	}
	if again := r.reconcile(); again.Primary != 0 || again.Reminder != 0 || again.Overdue != 0 {
		t.Fatalf("a DISABLED registration still produced notifications: %+v", again)
	}

	w.exec(`UPDATE registrations SET state = 'ACTIVE', activation_version = activation_version + 1,
		schedule_version = schedule_version + 1 WHERE id = $1`, w.RegistrationID)

	result := r.reconcile()
	if result.Primary != 1 {
		t.Fatalf("expected a fresh primary notification after reactivation, got %+v", result)
	}
	if r.primaryKey(models.ChannelTelegram) == firstKey {
		t.Fatalf("the activation version bump did not change the key")
	}
}

func TestEventTitleChangeDoesNotRewriteSnapshot(t *testing.T) {
	w := newWorld(t)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	existing := r.byKey(r.primaryKey(models.ChannelTelegram))
	if existing.Payload.EventTitle != "Test event" {
		t.Fatalf("unexpected snapshot title: %s", existing.Payload.EventTitle)
	}

	w.exec(`UPDATE events SET title = 'Renamed event' WHERE id = $1`, w.EventID)
	r.reconcile()

	if r.load(existing.ID).Payload.EventTitle != "Test event" {
		t.Fatalf("the existing payload snapshot was rewritten by a title change")
	}

	w.setStatus(models.StatusDONE)
	w.setStatus(models.StatusTODO)
	w.exec(`UPDATE registrations SET notification_content_version = notification_content_version + 1
		WHERE id = $1`, w.RegistrationID)
	r.reconcile()

	fresh := r.byKey(r.primaryKey(models.ChannelTelegram))
	if fresh.Payload.EventTitle != "Renamed event" {
		t.Fatalf("a fresh notification must use the current title, got %s", fresh.Payload.EventTitle)
	}
}

func TestArchivedEventStopsReconciliation(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	w.wantReminder(1)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	pending := w.countAll()
	if pending != 2 {
		t.Fatalf("expected two notifications before archiving, got %d", pending)
	}

	w.exec(`UPDATE events SET archived_at = now() WHERE id = $1`, w.EventID)
	if err := r.notifier.CancelForEvent(w.ctx, w.EventID); err != nil {
		t.Fatalf("cancelling on archive: %v", err)
	}

	for _, key := range w.keys() {
		requireStatus(t, r.byKey(key), models.NotificationCancelled)
	}
	result := r.reconcile()
	if result.Scanned != 0 {
		t.Fatalf("an archived event must not be a candidate, scanned %d", result.Scanned)
	}
	if got := w.countAll(); got != pending {
		t.Fatalf("reconciliation created notifications for an archived event: %d", got)
	}
}

func TestRetentionKeepsLogicalKeyAndBlocksRecreation(t *testing.T) {
	w := newWorld(t)
	w.clearSchedule()
	w.wantReminder(1)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	key := r.reminderKey(1, models.ChannelTelegram)
	old := r.byKey(key)
	w.exec(`UPDATE notifications SET status = 'SENT', sent_at = now(), created_at = now() - interval '120 days'
		WHERE id = $1`, old.ID)

	w.cfg.Retent.NotificationPayload = 90 * 24 * time.Hour
	w.cfg.Retent.AuditLog = 365 * 24 * time.Hour
	svcdelivery.RunRetention(r.delivery, w.ctx)

	after := r.load(old.ID)
	if after.Payload != nil {
		t.Fatalf("retention did not clear payload_json")
	}
	if after.LogicalKey != key {
		t.Fatalf("retention changed the logical key: %s", after.LogicalKey)
	}
	requireStatus(t, after, models.NotificationSent)

	result := r.reconcile()
	if result.Reminder != 0 {
		t.Fatalf("reconciliation recreated a notification with a retained logical key: %+v", result)
	}
	if got := w.countByKey(key); got != 1 {
		t.Fatalf("expected exactly one row for %s, got %d", key, got)
	}
}

func TestNotificationRowsCannotBeDeleted(t *testing.T) {
	w := newWorld(t)
	r := newRig(t, w, newSender(), newSender())
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	n := r.byKey(r.primaryKey(models.ChannelTelegram))
	if _, err := w.pool.Exec(w.ctx, `DELETE FROM notifications WHERE id = $1`, n.ID); err == nil {
		t.Fatalf("deleting a notification must be forbidden by the trigger")
	}
}
