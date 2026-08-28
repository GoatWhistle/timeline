//go:build integration

package authz_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"
)

func TestUserActiveToInactiveRevokesSessionsAndCancelsPending(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	f.seedPending(t, s)
	cancelledBefore := s.notificationCount(t, f.eventID, "CANCELLED")

	member := s.session(t, f.member)
	requireStatus(t, member.get("/me"), http.StatusOK, "the member reading its own profile")

	outsider := s.session(t, f.outsider)
	requireErrorCode(t, outsider.post("/admin/users/"+f.member.ID.String()+"/deactivate", nil),
		http.StatusForbidden, "forbidden", "one participant deactivating another")
	if !s.userIsActive(t, f.member.ID) {
		t.Fatalf("the refused attempt deactivated the account")
	}

	requireStatus(t, f.adminClient.post("/admin/users/"+f.member.ID.String()+"/deactivate", nil),
		http.StatusOK, "deactivating the member")
	if s.userIsActive(t, f.member.ID) {
		t.Fatalf("the account stayed active after deactivation")
	}
	if pending := s.pendingForStatus(t, f.statusID); pending != 0 {
		t.Fatalf("deactivation left %d pending notifications", pending)
	}
	if cancelled := s.notificationCount(t, f.eventID, "CANCELLED"); cancelled <= cancelledBefore {
		t.Fatalf("deactivation cancelled nothing beyond the %d already cancelled", cancelledBefore)
	}
	if chat := s.telegramBinding(t, f.member.ID); chat != nil {
		t.Fatalf("deactivation kept the telegram binding %q", *chat)
	}
	if sessions := s.liveSessions(t, f.member.ID); sessions != 0 {
		t.Fatalf("deactivation left %d live sessions", sessions)
	}

	requireErrorCode(t, member.post("/auth/refresh", nil),
		http.StatusUnauthorized, "unauthorized", "a deactivated account renewing its session")
	requireErrorCode(t, f.adminClient.post("/admin/users/"+f.member.ID.String()+"/deactivate", nil),
		http.StatusConflict, "already_inactive", "deactivating an already inactive account")
}

func TestUserInactiveToActiveRestoresAccessWithoutResurrectingNotifications(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	f.seedPending(t, s)
	requireStatus(t, f.adminClient.post("/admin/users/"+f.member.ID.String()+"/deactivate", nil),
		http.StatusOK, "deactivating the member")
	cancelledBefore := s.notificationCount(t, f.eventID, "CANCELLED")

	outsider := s.session(t, f.outsider)
	requireErrorCode(t, outsider.post("/admin/users/"+f.member.ID.String()+"/activate", nil),
		http.StatusForbidden, "forbidden", "one participant reactivating another")
	if s.userIsActive(t, f.member.ID) {
		t.Fatalf("the refused attempt reactivated the account")
	}

	requireStatus(t, f.adminClient.post("/admin/users/"+f.member.ID.String()+"/activate", nil),
		http.StatusOK, "reactivating the member")
	if !s.userIsActive(t, f.member.ID) {
		t.Fatalf("the account stayed inactive after reactivation")
	}
	if cancelled := s.notificationCount(t, f.eventID, "CANCELLED"); cancelled != cancelledBefore {
		t.Fatalf("reactivation moved the cancelled count from %d to %d", cancelledBefore, cancelled)
	}
	if pending := s.pendingForStatus(t, f.statusID); pending != 0 {
		t.Fatalf("reactivation resurrected %d cancelled notifications", pending)
	}

	restored := s.session(t, f.member)
	requireStatus(t, restored.get("/me"), http.StatusOK, "a restored account reading its profile")

	requireErrorCode(t, f.adminClient.post("/admin/users/"+f.member.ID.String()+"/activate", nil),
		http.StatusConflict, "already_active", "reactivating an already active account")
}

func TestOwnDeactivationRequestEndsTheOwnSessionOnly(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	member := s.session(t, f.member)
	requireStatus(t, member.post("/me/deactivate", nil), http.StatusOK, "the member deactivating itself")
	if s.userIsActive(t, f.member.ID) {
		t.Fatalf("the self-deactivation left the account active")
	}
	if resp := member.get("/me"); resp.Status != http.StatusUnauthorized && resp.Status != http.StatusForbidden {
		t.Fatalf("a self-deactivated account still reads its profile: status %d body %s", resp.Status, resp.Body)
	}
	if live := s.liveSessions(t, f.member.ID); live != 0 {
		t.Fatalf("the self-deactivation left %d live sessions", live)
	}
	if !s.userIsActive(t, f.admin.ID) {
		t.Fatalf("the self-deactivation reached the administrator account")
	}
}

func (s *stack) telegramBinding(t *testing.T, userID uuid.UUID) *string {
	t.Helper()
	var chat *string
	if err := s.db.Pool().QueryRow(context.Background(),
		`SELECT telegram_chat_id FROM users WHERE id = $1`, userID).Scan(&chat); err != nil {
		t.Fatalf("reading the telegram binding of %s: %v", userID, err)
	}
	return chat
}
