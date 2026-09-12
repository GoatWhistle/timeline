//go:build integration

package retentiontest_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
	"github.com/GoatWhistle/timeline/internal/models"
)

type auditPage struct {
	Items []struct {
		Action     string `json:"action"`
		EntityID   string `json:"entity_id"`
		EntityType string `json:"entity_type"`
	} `json:"items"`
}

func readAuditActions(t *testing.T, c *support.Client, entityID string) []string {
	t.Helper()
	resp := c.Get("/admin/audit?entity_id=" + entityID)
	support.RequireStatus(t, resp, http.StatusOK, "reading the audit log")
	var page auditPage
	resp.Decode(t, &page)
	actions := make([]string, 0, len(page.Items))
	for _, item := range page.Items {
		actions = append(actions, item.Action)
	}
	return actions
}

func containsAction(actions []string, want string) bool {
	for _, a := range actions {
		if a == want {
			return true
		}
	}
	return false
}

func TestSystemArchiveIsAuditedSeparatelyFromAnAdminArchive(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	ctx := context.Background()

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+f.OtherEvent+"/archive", nil),
		http.StatusOK, "an administrator archiving an event")

	otherUUID, err := s.EventService().ResolveDisplayID(ctx, f.OtherEvent)
	if err != nil {
		t.Fatalf("resolving the other event id: %v", err)
	}
	adminActions := readAuditActions(t, f.AdminClient, otherUUID.String())
	if !containsAction(adminActions, "EVENT_ARCHIVE") {
		t.Fatalf("an administrator archiving an event was not recorded as EVENT_ARCHIVE: %v", adminActions)
	}
	if containsAction(adminActions, "EVENT_AUTO_ARCHIVE") {
		t.Fatalf("an administrator archiving an event was wrongly recorded as EVENT_AUTO_ARCHIVE: %v", adminActions)
	}

	eventID, err := s.EventService().ResolveDisplayID(ctx, f.EventID)
	if err != nil {
		t.Fatalf("resolving the event id: %v", err)
	}
	if _, err := s.EventService().Archive(ctx, models.Actor{}, eventID); err != nil {
		t.Fatalf("the system actor could not archive the event: %v", err)
	}

	systemActions := readAuditActions(t, f.AdminClient, eventID.String())
	if !containsAction(systemActions, "EVENT_AUTO_ARCHIVE") {
		t.Fatalf("an automatic archive was not recorded as EVENT_AUTO_ARCHIVE: %v", systemActions)
	}
	if containsAction(systemActions, "EVENT_ARCHIVE") {
		t.Fatalf("an automatic archive was wrongly recorded as the manual EVENT_ARCHIVE: %v", systemActions)
	}
}
