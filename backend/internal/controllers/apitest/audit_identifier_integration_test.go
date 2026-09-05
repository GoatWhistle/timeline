//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type auditPage struct {
	Items []struct {
		ID          string  `json:"id"`
		ActorUserID *string `json:"actor_user_id"`
		ActorEmail  *string `json:"actor_email"`
		Action      string  `json:"action"`
		EntityType  string  `json:"entity_type"`
		EntityID    *string `json:"entity_id"`
	} `json:"items"`
	Meta struct {
		Total int64 `json:"total"`
	} `json:"meta"`
}

func readAudit(c *support.Client, t *testing.T, query string) (auditPage, support.Response) {
	t.Helper()
	resp := c.Get("/admin/audit" + query)
	support.RequireStatus(t, resp, http.StatusOK, "reading the audit log")
	var page auditPage
	resp.Decode(t, &page)
	if len(page.Items) == 0 {
		t.Fatalf("the seeded stack produced no audit entries to inspect: %s", resp.Body)
	}
	return page, resp
}

func TestAuditNamesTheActorByDisplayIdentifier(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	page, _ := readAudit(f.AdminClient, t, "")

	found := false
	for _, item := range page.Items {
		if item.ActorUserID == nil {
			continue
		}
		found = true
		if !strings.HasPrefix(*item.ActorUserID, "us_") {
			t.Fatalf("actor_user_id is %q, want the external us_ identifier", *item.ActorUserID)
		}
		if uuidShape.MatchString(*item.ActorUserID) {
			t.Fatalf("actor_user_id still carries a UUID: %q", *item.ActorUserID)
		}
	}
	if !found {
		t.Fatal("no audit entry carried an actor, so the identifier shape was never exercised")
	}
}

func TestAuditFiltersByTheDisplayIdentifierItReturns(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	page, _ := readAudit(f.AdminClient, t, "")
	var actor string
	for _, item := range page.Items {
		if item.ActorUserID != nil {
			actor = *item.ActorUserID
			break
		}
	}
	if actor == "" {
		t.Fatal("no audit entry carried an actor to filter by")
	}

	filtered, _ := readAudit(f.AdminClient, t, "?actor_user_id="+actor)
	for _, item := range filtered.Items {
		if item.ActorUserID == nil || *item.ActorUserID != actor {
			t.Fatalf("filtering by %s returned an entry of another actor: %+v", actor, item)
		}
	}

	empty := f.AdminClient.Get("/admin/audit?actor_user_id=us_zzzzzzzzzzzz")
	support.RequireStatus(t, empty, http.StatusOK, "filtering by an actor that does not exist")
	var none auditPage
	empty.Decode(t, &none)
	if none.Meta.Total != 0 {
		t.Fatalf("filtering by an unknown actor matched %d entries", none.Meta.Total)
	}
}

func TestAuditKeepsOnlyTheInternalJournalIdentifiers(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	_, resp := readAudit(f.AdminClient, t, "")
	for _, field := range []string{"password_hash", "telegram_chat_id"} {
		support.RequireNoBodyField(t, resp, field, "the audit log")
	}

	var page auditPage
	resp.Decode(t, &page)
	for _, item := range page.Items {
		if item.ActorEmail != nil && uuidShape.MatchString(*item.ActorEmail) {
			t.Fatalf("actor_email carries a UUID: %q", *item.ActorEmail)
		}
	}
}
