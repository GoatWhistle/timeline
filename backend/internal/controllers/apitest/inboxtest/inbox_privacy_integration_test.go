//go:build integration

package inboxtest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func seedInboxItem(t *testing.T, s *support.Stack, recipientEmail string) string {
	t.Helper()
	var displayID string
	err := s.DB().Pool().QueryRow(context.Background(), `
		INSERT INTO inbox_items (recipient_user_id, kind, title, body_md, logical_key)
		SELECT id, 'notification.primary', 'Title', 'Body', 'privacy-test:'||gen_random_uuid()
		FROM users WHERE email = $1
		RETURNING display_id`, recipientEmail).Scan(&displayID)
	if err != nil {
		t.Fatalf("seeding an inbox item for %s: %v", recipientEmail, err)
	}
	return displayID
}

const missingInboxItemID = "ib_zzzzzzzzzzzz"

func TestForeignInboxItemIsHiddenNotForbidden(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	itemID := seedInboxItem(t, s, f.Member.Email)
	outsider := s.Session(t, f.Outsider)

	get := outsider.Delete("/me/inbox/" + itemID)
	support.RequireStatus(t, get, http.StatusNotFound, "deleting a foreign inbox item")

	missing := outsider.Delete("/me/inbox/" + missingInboxItemID)
	support.RequireStatus(t, missing, http.StatusNotFound, "deleting a nonexistent inbox item")

	if get.ErrorCode(t) != missing.ErrorCode(t) {
		t.Fatalf("a foreign inbox item is distinguishable from a missing one: %s versus %s",
			get.Body, missing.Body)
	}

	restore := outsider.Post("/me/inbox/"+itemID+"/restore", nil)
	support.RequireStatus(t, restore, http.StatusNotFound, "restoring a foreign inbox item")

	markRegistered := outsider.Post("/me/inbox/"+itemID+"/mark-registered", nil)
	support.RequireStatus(t, markRegistered, http.StatusNotFound, "confirming registration from a foreign inbox item")

	owner := s.Session(t, f.Member)
	stillThere := owner.Get("/me/inbox")
	support.RequireStatus(t, stillThere, http.StatusOK, "the owner reads their own inbox")
	if !support.ContainsAll(string(stillThere.Body), itemID) {
		t.Fatalf("the rejected foreign attempts removed the owner's item: %s", stillThere.Body)
	}
}

func TestForeignInboxItemCannotBeMarkedReadOrDeletedInBulk(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	itemID := seedInboxItem(t, s, f.Member.Email)
	outsider := s.Session(t, f.Outsider)

	markRead := outsider.Post("/me/inbox/read", map[string]any{"ids": []string{itemID}})
	support.RequireStatus(t, markRead, http.StatusOK, "marking a mixed-ownership batch read")
	if !support.ContainsAll(string(markRead.Body), `"unread":0`) {
		t.Fatalf("marking read reported affecting the outsider's own empty inbox unexpectedly: %s", markRead.Body)
	}

	owner := s.Session(t, f.Member)
	list := owner.Get("/me/inbox?unread=true")
	support.RequireStatus(t, list, http.StatusOK, "the owner checks their unread items")
	if !support.ContainsAll(string(list.Body), itemID) {
		t.Fatalf("a foreign mark-read call marked the owner's item read: %s", list.Body)
	}

	deleteAll := outsider.Delete("/me/inbox")
	support.RequireStatus(t, deleteAll, http.StatusOK, "the outsider clears their own inbox")

	afterDeleteAll := owner.Get("/me/inbox")
	support.RequireStatus(t, afterDeleteAll, http.StatusOK, "the owner rereads their inbox")
	if !support.ContainsAll(string(afterDeleteAll.Body), itemID) {
		t.Fatalf("the outsider's delete-all removed the owner's item: %s", afterDeleteAll.Body)
	}
}

func TestNotificationPreferencesAreScopedToTheCallerOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	outsider := s.Session(t, f.Outsider)

	before := member.Get("/me/notification-preferences")
	support.RequireStatus(t, before, http.StatusOK, "the member reads their own preferences")

	off := outsider.Mutate(http.MethodPut, "/me/notification-preferences/REGISTRATION_REQUIRED/EMAIL",
		map[string]any{"enabled": false})
	support.RequireStatus(t, off, http.StatusOK, "the outsider silences their own email channel")

	after := member.Get("/me/notification-preferences")
	support.RequireStatus(t, after, http.StatusOK, "the member rereads their own preferences")
	if string(after.Body) != string(before.Body) {
		t.Fatalf("TestNotificationPreferencesAreScopedToTheCallerOnly: one user's unsubscribe changed "+
			"another user's notification preferences:\nbefore %s\nafter  %s", before.Body, after.Body)
	}
}

func TestOrdinaryParticipantCannotReachAdminNotificationSurfaces(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)

	preview := member.Get("/admin/registration-statuses/" + f.StatusID + "/notification-preview")
	support.RequireStatus(t, preview, http.StatusForbidden,
		"an ordinary participant asks for a notification preview")

	queue := member.Get("/ops/queue")
	support.RequireStatus(t, queue, http.StatusForbidden,
		"an ordinary participant reads the delivery queue")

	heartbeat := member.Get("/ops/worker-heartbeat")
	support.RequireStatus(t, heartbeat, http.StatusForbidden,
		"an ordinary participant reads the worker heartbeat")
}
