//go:build integration

package authz_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func (c *client) createStage(t *testing.T, eventID uuid.UUID, name string) uuid.UUID {
	t.Helper()
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	resp := c.post("/admin/events/"+eventID.String()+"/stages", map[string]any{
		"name":     name,
		"type":     "SUBMISSION",
		"start_at": start.Format(time.RFC3339),
		"end_at":   start.Add(time.Hour).Format(time.RFC3339),
	})
	requireStatus(t, resp, http.StatusCreated, "creating stage "+name)
	var body struct {
		ID uuid.UUID `json:"id"`
	}
	resp.decode(t, &body)
	return body.ID
}

func (c *client) createLink(t *testing.T, eventID uuid.UUID, payload map[string]any) response {
	t.Helper()
	return c.post("/events/"+eventID.String()+"/links", payload)
}

func TestResourceLinkRejectsStageOfAnotherEvent(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	foreignStage := f.adminClient.createStage(t, f.otherEvent, "Foreign submission")

	resp := f.adminClient.createLink(t, f.eventID, map[string]any{
		"kind":     "SUBMISSION",
		"url":      "https://example.org/submit",
		"stage_id": foreignStage.String(),
	})
	if resp.Status != http.StatusBadRequest && resp.Status != http.StatusNotFound {
		t.Fatalf("a stage of another event was accepted: status %d body %s", resp.Status, resp.Body)
	}

	list := f.adminClient.get("/events/" + f.eventID.String() + "/links")
	requireStatus(t, list, http.StatusOK, "listing links")
	if strings.Contains(string(list.Body), "example.org/submit") {
		t.Fatalf("the rejected link was stored anyway: %s", list.Body)
	}
	if s.countRows(t, "resource_links") != 0 {
		t.Fatalf("the rejected link left a row in resource_links")
	}
}

func TestResourceLinkCannotBeMovedToAForeignStage(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	ownStage := f.adminClient.createStage(t, f.eventID, "Own submission")
	foreignStage := f.adminClient.createStage(t, f.otherEvent, "Foreign submission")

	created := f.adminClient.createLink(t, f.eventID, map[string]any{
		"kind":     "SUBMISSION",
		"url":      "https://example.org/submit",
		"stage_id": ownStage.String(),
	})
	requireStatus(t, created, http.StatusCreated, "creating a stage link")
	var link struct {
		ID      uuid.UUID  `json:"id"`
		StageID *uuid.UUID `json:"stage_id"`
	}
	created.decode(t, &link)
	if link.StageID == nil || *link.StageID != ownStage {
		t.Fatalf("the link did not keep its own stage: %s", created.Body)
	}

	moved := f.adminClient.patch(
		"/events/"+f.eventID.String()+"/links/"+link.ID.String(),
		map[string]any{"stage_id": foreignStage.String()})
	if moved.Status != http.StatusBadRequest && moved.Status != http.StatusNotFound {
		t.Fatalf("a link was moved to a stage of another event: status %d body %s",
			moved.Status, moved.Body)
	}

	after := f.adminClient.get("/events/" + f.eventID.String() + "/links")
	if strings.Contains(string(after.Body), foreignStage.String()) {
		t.Fatalf("the link now points at a foreign stage: %s", after.Body)
	}
}

func TestResourceLinkRejectsExecutableSchemes(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	for _, bad := range []string{
		"javascript:alert(document.cookie)",
		"JaVaScRiPt://example.org/%0aalert(1)",
		"data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
		"vbscript:msgbox(1)",
		"file:///etc/passwd",
	} {
		resp := f.adminClient.createLink(t, f.eventID, map[string]any{
			"kind": "OTHER",
			"url":  bad,
		})
		requireStatus(t, resp, http.StatusBadRequest, "storing "+bad)
	}

	if s.countRows(t, "resource_links") != 0 {
		t.Fatalf("an executable scheme was stored in resource_links")
	}
}

func TestResourceLinkAcceptsAnyNonExecutableScheme(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	for _, good := range []string{
		"https://example.org/rules",
		"http://example.org/rules",
		"http://intranet.local:8080/form",
		"tg://resolve?domain=hackathon_crew",
	} {
		resp := f.adminClient.createLink(t, f.eventID, map[string]any{
			"kind": "CHAT",
			"url":  good,
		})
		requireStatus(t, resp, http.StatusCreated, "storing "+good)
	}

	list := f.adminClient.get("/events/" + f.eventID.String() + "/links")
	if !containsAll(string(list.Body),
		"http://example.org/rules", "tg://resolve?domain=hackathon_crew") {
		t.Fatalf("a non-HTTPS address was not stored verbatim: %s", list.Body)
	}
}

func TestResourceLinkPinnedComeFirst(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)

	requireStatus(t, f.adminClient.createLink(t, f.eventID, map[string]any{
		"kind": "DATASET", "url": "https://example.org/data", "sort_order": 0,
	}), http.StatusCreated, "creating a plain link")
	requireStatus(t, f.adminClient.createLink(t, f.eventID, map[string]any{
		"kind": "RULES", "url": "https://example.org/rules",
		"is_pinned": true, "sort_order": 9,
	}), http.StatusCreated, "creating a pinned link")

	list := f.adminClient.get("/events/" + f.eventID.String() + "/links")
	requireStatus(t, list, http.StatusOK, "listing links")
	body := string(list.Body)
	if strings.Index(body, "example.org/rules") > strings.Index(body, "example.org/data") {
		t.Fatalf("a pinned link did not come first despite a higher sort_order: %s", body)
	}
}

func TestResourceLinksAreAdministrative(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	requireStatus(t, member.createLink(t, f.eventID, map[string]any{
		"kind": "OTHER", "url": "https://example.org/sneaky",
	}), http.StatusForbidden, "a member creating an event link")

	requireStatus(t, f.adminClient.createLink(t, f.eventID, map[string]any{
		"kind": "RULES", "url": "https://example.org/rules",
	}), http.StatusCreated, "an administrator creating an event link")

	requireStatus(t, member.get("/events/"+f.eventID.String()+"/links"),
		http.StatusOK, "an assigned member reading event links")

	outsider := s.session(t, f.outsider)
	requireStatus(t, outsider.createLink(t, f.eventID, map[string]any{
		"kind": "OTHER", "url": "https://example.org/sneaky",
	}), http.StatusForbidden, "an outsider creating an event link")
}
