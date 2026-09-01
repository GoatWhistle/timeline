//go:build integration

package apitest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestUserActiveToInactiveRevokesSessionsAndCancelsPending(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	seedPending(f, t, s)
	cancelledBefore := notificationCount(s, t, f.EventID, "CANCELLED")

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Get("/me"), http.StatusOK, "the member reading its own profile")

	outsider := s.Session(t, f.Outsider)
	requireErrorCode(t, outsider.Post("/admin/users/"+f.Member.ID+"/deactivate", nil),
		http.StatusForbidden, "forbidden", "one participant deactivating another")
	if !userIsActive(s, t, f.Member.ID) {
		t.Fatalf("the refused attempt deactivated the support.Account")
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/users/"+f.Member.ID+"/deactivate", nil),
		http.StatusOK, "deactivating the member")
	if userIsActive(s, t, f.Member.ID) {
		t.Fatalf("the support.Account stayed active after deactivation")
	}
	if pending := pendingForStatus(s, t, f.StatusID); pending != 0 {
		t.Fatalf("deactivation left %d pending notifications", pending)
	}
	if cancelled := notificationCount(s, t, f.EventID, "CANCELLED"); cancelled <= cancelledBefore {
		t.Fatalf("deactivation cancelled nothing beyond the %d already cancelled", cancelledBefore)
	}
	if chat := telegramBinding(s, t, f.Member.ID); chat != nil {
		t.Fatalf("deactivation kept the telegram binding %q", *chat)
	}
	if sessions := liveSessions(s, t, f.Member.ID); sessions != 0 {
		t.Fatalf("deactivation left %d live sessions", sessions)
	}

	requireErrorCode(t, member.Post("/auth/refresh", nil),
		http.StatusUnauthorized, "unauthorized", "a deactivated support.Account renewing its session")
	requireErrorCode(t, f.AdminClient.Post("/admin/users/"+f.Member.ID+"/deactivate", nil),
		http.StatusConflict, "already_inactive", "deactivating an already inactive support.Account")
}

func TestUserInactiveToActiveRestoresAccessWithoutResurrectingNotifications(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	seedPending(f, t, s)
	support.RequireStatus(t, f.AdminClient.Post("/admin/users/"+f.Member.ID+"/deactivate", nil),
		http.StatusOK, "deactivating the member")
	cancelledBefore := notificationCount(s, t, f.EventID, "CANCELLED")

	outsider := s.Session(t, f.Outsider)
	requireErrorCode(t, outsider.Post("/admin/users/"+f.Member.ID+"/activate", nil),
		http.StatusForbidden, "forbidden", "one participant reactivating another")
	if userIsActive(s, t, f.Member.ID) {
		t.Fatalf("the refused attempt reactivated the support.Account")
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/users/"+f.Member.ID+"/activate", nil),
		http.StatusOK, "reactivating the member")
	if !userIsActive(s, t, f.Member.ID) {
		t.Fatalf("the support.Account stayed inactive after reactivation")
	}
	if cancelled := notificationCount(s, t, f.EventID, "CANCELLED"); cancelled != cancelledBefore {
		t.Fatalf("reactivation moved the cancelled count from %d to %d", cancelledBefore, cancelled)
	}
	if pending := pendingForStatus(s, t, f.StatusID); pending != 0 {
		t.Fatalf("reactivation resurrected %d cancelled notifications", pending)
	}

	restored := s.Session(t, f.Member)
	support.RequireStatus(t, restored.Get("/me"), http.StatusOK, "a restored support.Account reading its profile")

	requireErrorCode(t, f.AdminClient.Post("/admin/users/"+f.Member.ID+"/activate", nil),
		http.StatusConflict, "already_active", "reactivating an already active support.Account")
}

func TestOwnDeactivationRequestEndsTheOwnSessionOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Post("/me/deactivate", nil), http.StatusOK, "the member deactivating itself")
	if userIsActive(s, t, f.Member.ID) {
		t.Fatalf("the self-deactivation left the support.Account active")
	}
	if resp := member.Get("/me"); resp.Status != http.StatusUnauthorized && resp.Status != http.StatusForbidden {
		t.Fatalf("a self-deactivated support.Account still reads its profile: status %d body %s", resp.Status, resp.Body)
	}
	if live := liveSessions(s, t, f.Member.ID); live != 0 {
		t.Fatalf("the self-deactivation left %d live sessions", live)
	}
	if !userIsActive(s, t, f.Admin.ID) {
		t.Fatalf("the self-deactivation reached the administrator support.Account")
	}
}

func telegramBinding(s *support.Stack, t *testing.T, userID string) *string {
	t.Helper()
	var chat *string
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT telegram_chat_id FROM users WHERE display_id = $1`, userID).Scan(&chat); err != nil {
		t.Fatalf("reading the telegram binding of %s: %v", userID, err)
	}
	return chat
}
