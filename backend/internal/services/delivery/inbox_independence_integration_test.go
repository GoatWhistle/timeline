//go:build integration

package delivery_test

import (
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (r *rig) onlyInboxItem() (id string, deleted bool) {
	r.world.t.Helper()
	var displayID string
	var deletedAt *time.Time
	err := r.world.pool.QueryRow(r.world.ctx, `
		SELECT display_id, deleted_at FROM inbox_items
		WHERE recipient_user_id = $1`, r.world.UserID).Scan(&displayID, &deletedAt)
	if err != nil {
		r.world.t.Fatalf("loading the inbox item: %v", err)
	}
	return displayID, deletedAt != nil
}

func (r *rig) softDeleteInboxItem() {
	r.world.t.Helper()
	displayID, _ := r.onlyInboxItem()
	id, err := r.inbox.ResolveDisplayID(r.world.ctx, displayID)
	if err != nil {
		r.world.t.Fatalf("resolving the inbox item: %v", err)
	}
	actor := models.Actor{UserID: r.world.UserID}
	if err := r.inbox.Delete(r.world.ctx, actor, id); err != nil {
		r.world.t.Fatalf("deleting the inbox item: %v", err)
	}
}

func TestDeletingInboxItemDoesNotCancelDelivery(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	telegram, email := newSender(), newSender()
	r, n := seedOneDue(t, w, telegram, email)

	if _, deleted := r.onlyInboxItem(); deleted {
		t.Fatalf("the freshly created inbox item must not start out deleted")
	}

	r.softDeleteInboxItem()

	after := r.load(n.ID)
	requireStatus(t, after, models.NotificationPending)

	r.work()

	after = r.load(n.ID)
	requireStatus(t, after, models.NotificationSent)
	if email.count() != 1 {
		t.Fatalf("deleting the inbox item must not block delivery: expected 1 email call, got %d", email.count())
	}
}

func TestDeliveringDoesNotDeleteTheInboxItem(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	telegram, email := newSender(), newSender()
	r, n := seedOneDue(t, w, telegram, email)
	_ = n

	r.work()

	if _, deleted := r.onlyInboxItem(); deleted {
		t.Fatalf("delivering the notification must not soft-delete the linked inbox item")
	}
}

func TestSoftDeletedInboxItemSurvivesNotificationCancellation(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	telegram, email := newSender(), newSender()
	r, _ := seedOneDue(t, w, telegram, email)
	_ = telegram
	_ = email

	r.softDeleteInboxItem()

	if err := r.notifier.CancelForRegistration(r.world.ctx, r.world.RegistrationID); err != nil {
		t.Fatalf("cancelling the registration's notifications: %v", err)
	}

	displayID, deleted := r.onlyInboxItem()
	if displayID == "" {
		t.Fatalf("the inbox item row must still exist after cancellation")
	}
	if !deleted {
		t.Fatalf("cancellation must not restore an item the user deleted")
	}
}
