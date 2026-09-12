//go:build integration

package inbox_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	pginbox "github.com/GoatWhistle/timeline/internal/adapters/postgres/inbox"
	"github.com/GoatWhistle/timeline/internal/models"
	svcinbox "github.com/GoatWhistle/timeline/internal/services/inbox"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type fakeNotifier struct {
	calls []uuid.UUID
}

func (f *fakeNotifier) NotifyInbox(_ context.Context, userID uuid.UUID) error {
	f.calls = append(f.calls, userID)
	return nil
}

func newTestUser(t *testing.T, db *postgres.DB) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := db.Pool().QueryRow(context.Background(), `
		INSERT INTO users (first_name, last_name, email, password_hash)
		VALUES ('Test', 'User', $1, 'hash') RETURNING id`,
		"inbox-"+uuid.NewString()+"@example.test").Scan(&id)
	if err != nil {
		t.Fatalf("seeding a user: %v", err)
	}
	return id
}

func setup(t *testing.T) (*postgres.DB, *svcinbox.Service, *fakeNotifier) {
	t.Helper()
	db := testsupport.DB(t)
	repo := pginbox.NewItems(db)
	notifier := &fakeNotifier{}
	svc := svcinbox.NewService(repo, nil)
	svc.WithNotifier(notifier)
	return db, svc, notifier
}

func insertItem(t *testing.T, db *postgres.DB, userID uuid.UUID, logicalKey string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := db.Pool().QueryRow(context.Background(), `
		INSERT INTO inbox_items (recipient_user_id, kind, title, body_md, logical_key)
		VALUES ($1, 'notification.primary', 'Title', 'Body', $2) RETURNING id`,
		userID, logicalKey).Scan(&id)
	if err != nil {
		t.Fatalf("seeding an inbox item: %v", err)
	}
	return id
}

func TestMarkReadNotifiesTheRecipientOnce(t *testing.T) {
	db, svc, notifier := setup(t)
	ctx := context.Background()
	userID := newTestUser(t, db)
	id := insertItem(t, db, userID, "k1")
	actor := models.Actor{UserID: userID}

	affected, err := svc.MarkRead(ctx, actor, []uuid.UUID{id})
	if err != nil {
		t.Fatalf("marking read: %v", err)
	}
	if affected != 1 {
		t.Fatalf("affected = %d, want 1", affected)
	}
	if len(notifier.calls) != 1 || notifier.calls[0] != userID {
		t.Errorf("notifier calls = %+v, want one call for %v", notifier.calls, userID)
	}
}

func TestMarkReadDoesNotNotifyWhenNothingChanged(t *testing.T) {
	db, svc, notifier := setup(t)
	ctx := context.Background()
	userID := newTestUser(t, db)
	id := insertItem(t, db, userID, "k1")
	actor := models.Actor{UserID: userID}

	if _, err := svc.MarkRead(ctx, actor, []uuid.UUID{id}); err != nil {
		t.Fatalf("first mark read: %v", err)
	}
	notifier.calls = nil

	affected, err := svc.MarkRead(ctx, actor, []uuid.UUID{id})
	if err != nil {
		t.Fatalf("second mark read: %v", err)
	}
	if affected != 0 {
		t.Fatalf("affected = %d, want 0 for an already-read item", affected)
	}
	if len(notifier.calls) != 0 {
		t.Errorf("notifier called %d times for a no-op mark read", len(notifier.calls))
	}
}

func TestDeleteIsSoftAndRestoreBringsItBack(t *testing.T) {
	db, svc, _ := setup(t)
	ctx := context.Background()
	userID := newTestUser(t, db)
	id := insertItem(t, db, userID, "k1")
	actor := models.Actor{UserID: userID}

	if err := svc.Delete(ctx, actor, id); err != nil {
		t.Fatalf("deleting: %v", err)
	}

	items, total, err := svc.List(ctx, actor, false, models.Page{Number: 1, Size: 50})
	if err != nil {
		t.Fatalf("listing after delete: %v", err)
	}
	if total != 0 || len(items) != 0 {
		t.Fatalf("deleted item still visible: total=%d items=%d", total, len(items))
	}

	var deletedAtSet bool
	err = db.Pool().QueryRow(ctx,
		`SELECT deleted_at IS NOT NULL FROM inbox_items WHERE id = $1`, id).Scan(&deletedAtSet)
	if err != nil {
		t.Fatalf("checking deleted_at: %v", err)
	}
	if !deletedAtSet {
		t.Fatal("delete must be soft: the row must still exist with deleted_at set")
	}

	restored, err := svc.Restore(ctx, actor, id)
	if err != nil {
		t.Fatalf("restoring: %v", err)
	}
	if restored.DeletedAt != nil {
		t.Error("restored item still reports deleted_at")
	}

	items, total, err = svc.List(ctx, actor, false, models.Page{Number: 1, Size: 50})
	if err != nil {
		t.Fatalf("listing after restore: %v", err)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("restored item not visible again: total=%d items=%d", total, len(items))
	}
}

func TestDeleteDoesNotAffectOtherUsersItems(t *testing.T) {
	db, svc, _ := setup(t)
	ctx := context.Background()
	owner := newTestUser(t, db)
	other := newTestUser(t, db)
	id := insertItem(t, db, owner, "k1")

	err := svc.Delete(ctx, models.Actor{UserID: other}, id)
	if err == nil {
		t.Fatal("expected a not-found error deleting someone else's inbox item")
	}

	items, total, listErr := svc.List(ctx, models.Actor{UserID: owner}, false, models.Page{Number: 1, Size: 50})
	if listErr != nil {
		t.Fatalf("listing the owner's inbox: %v", listErr)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("owner's item disappeared: total=%d items=%d", total, len(items))
	}
}

func TestInsertDeduplicatesByLogicalKey(t *testing.T) {
	db, svc, _ := setup(t)
	ctx := context.Background()
	userID := newTestUser(t, db)
	item := func() *models.InboxItem {
		return &models.InboxItem{
			RecipientUserID: userID,
			Kind:            "notification.primary",
			Title:           "Title",
			BodyMD:          "Body",
			LogicalKey:      "same-key",
		}
	}
	if err := svc.Create(ctx, item()); err != nil {
		t.Fatalf("first create: %v", err)
	}
	if err := svc.Create(ctx, item()); err != nil {
		t.Fatalf("second create: %v", err)
	}

	_, total, err := svc.List(ctx, models.Actor{UserID: userID}, false, models.Page{Number: 1, Size: 50})
	if err != nil {
		t.Fatalf("listing: %v", err)
	}
	if total != 1 {
		t.Fatalf("duplicate logical_key inserted %d items, want 1", total)
	}
}
