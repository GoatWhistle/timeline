//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func createStage(c *support.Client, t *testing.T, eventID string, name string) string {
	t.Helper()
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	resp := c.Post("/admin/events/"+eventID+"/stages", map[string]any{
		"name":     name,
		"type":     "SUBMISSION",
		"start_at": start.Format(time.RFC3339),
		"end_at":   start.Add(time.Hour).Format(time.RFC3339),
	})
	support.RequireStatus(t, resp, http.StatusCreated, "creating stage "+name)
	var body struct {
		ID string `json:"id"`
	}
	resp.Decode(t, &body)
	return body.ID
}

func createLink(c *support.Client, t *testing.T, eventID string, payload map[string]any) support.Response {
	t.Helper()
	return c.Post("/events/"+eventID+"/links", payload)
}

func TestResourceLinkRejectsStageOfAnotherEvent(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	foreignStage := createStage(f.AdminClient, t, f.OtherEvent, "Foreign submission")

	resp := createLink(f.AdminClient, t, f.EventID, map[string]any{
		"kind":     "SUBMISSION",
		"url":      "https://example.org/submit",
		"stage_id": foreignStage,
	})
	if resp.Status != http.StatusBadRequest && resp.Status != http.StatusNotFound {
		t.Fatalf("a stage of another event was accepted: status %d body %s", resp.Status, resp.Body)
	}

	list := f.AdminClient.Get("/events/" + f.EventID + "/links")
	support.RequireStatus(t, list, http.StatusOK, "listing links")
	if strings.Contains(string(list.Body), "example.org/submit") {
		t.Fatalf("the rejected link was stored anyway: %s", list.Body)
	}
	if countRows(s, t, "resource_links") != 0 {
		t.Fatalf("the rejected link left a row in resource_links")
	}
}

func TestResourceLinkCannotBeMovedToAForeignStage(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	ownStage := createStage(f.AdminClient, t, f.EventID, "Own submission")
	foreignStage := createStage(f.AdminClient, t, f.OtherEvent, "Foreign submission")

	created := createLink(f.AdminClient, t, f.EventID, map[string]any{
		"kind":     "SUBMISSION",
		"url":      "https://example.org/submit",
		"stage_id": ownStage,
	})
	support.RequireStatus(t, created, http.StatusCreated, "creating a stage link")
	var link struct {
		ID      string  `json:"id"`
		StageID *string `json:"stage_id"`
	}
	created.Decode(t, &link)
	if link.StageID == nil || *link.StageID != ownStage {
		t.Fatalf("the link did not keep its own stage: %s", created.Body)
	}

	moved := f.AdminClient.Patch(
		"/events/"+f.EventID+"/links/"+link.ID,
		map[string]any{"stage_id": foreignStage})
	if moved.Status != http.StatusBadRequest && moved.Status != http.StatusNotFound {
		t.Fatalf("a link was moved to a stage of another event: status %d body %s",
			moved.Status, moved.Body)
	}

	after := f.AdminClient.Get("/events/" + f.EventID + "/links")
	if strings.Contains(string(after.Body), foreignStage) {
		t.Fatalf("the link now points at a foreign stage: %s", after.Body)
	}
}

func TestResourceLinkRejectsExecutableSchemes(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	for _, bad := range []string{
		"javascript:alert(document.cookie)",
		"JaVaScRiPt://example.org/%0aalert(1)",
		"data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
		"vbscript:msgbox(1)",
		"file:///etc/passwd",
	} {
		resp := createLink(f.AdminClient, t, f.EventID, map[string]any{
			"kind": "OTHER",
			"url":  bad,
		})
		support.RequireStatus(t, resp, http.StatusBadRequest, "storing "+bad)
	}

	if countRows(s, t, "resource_links") != 0 {
		t.Fatalf("an executable scheme was stored in resource_links")
	}
}

func TestResourceLinkAcceptsAnyNonExecutableScheme(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	for _, good := range []string{
		"https://example.org/rules",
		"http://example.org/rules",
		"http://intranet.local:8080/form",
		"tg://resolve?domain=hackathon_crew",
	} {
		resp := createLink(f.AdminClient, t, f.EventID, map[string]any{
			"kind": "CHAT",
			"url":  good,
		})
		support.RequireStatus(t, resp, http.StatusCreated, "storing "+good)
	}

	list := f.AdminClient.Get("/events/" + f.EventID + "/links")
	if !support.ContainsAll(string(list.Body),
		"http://example.org/rules", "tg://resolve?domain=hackathon_crew") {
		t.Fatalf("a non-HTTPS address was not stored verbatim: %s", list.Body)
	}
}

func TestResourceLinkPinnedComeFirst(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, createLink(f.AdminClient, t, f.EventID, map[string]any{
		"kind": "DATASET", "url": "https://example.org/data", "sort_order": 0,
	}), http.StatusCreated, "creating a plain link")
	support.RequireStatus(t, createLink(f.AdminClient, t, f.EventID, map[string]any{
		"kind": "RULES", "url": "https://example.org/rules",
		"is_pinned": true, "sort_order": 9,
	}), http.StatusCreated, "creating a pinned link")

	list := f.AdminClient.Get("/events/" + f.EventID + "/links")
	support.RequireStatus(t, list, http.StatusOK, "listing links")
	body := string(list.Body)
	if strings.Index(body, "example.org/rules") > strings.Index(body, "example.org/data") {
		t.Fatalf("a pinned link did not come first despite a higher sort_order: %s", body)
	}
}

func TestResourceLinksAreAdministrative(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	support.RequireStatus(t, createLink(member, t, f.EventID, map[string]any{
		"kind": "OTHER", "url": "https://example.org/sneaky",
	}), http.StatusForbidden, "a member creating an event link")

	support.RequireStatus(t, createLink(f.AdminClient, t, f.EventID, map[string]any{
		"kind": "RULES", "url": "https://example.org/rules",
	}), http.StatusCreated, "an administrator creating an event link")

	support.RequireStatus(t, member.Get("/events/"+f.EventID+"/links"),
		http.StatusOK, "an assigned member reading event links")

	outsider := s.Session(t, f.Outsider)
	support.RequireStatus(t, createLink(outsider, t, f.EventID, map[string]any{
		"kind": "OTHER", "url": "https://example.org/sneaky",
	}), http.StatusForbidden, "an outsider creating an event link")
}
