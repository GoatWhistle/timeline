//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestPersonalLinksStayOutOfTheEventList(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	support.RequireStatus(t, createLink(f.AdminClient, t, f.EventID, map[string]any{
		"kind": "RULES", "url": "https://example.org/official-rules",
	}), http.StatusCreated, "creating an event link")

	created := member.Post("/me/events/"+f.EventID+"/links", map[string]any{
		"kind": "OTHER", "url": "https://example.org/my-private-notes",
	})
	support.RequireStatus(t, created, http.StatusCreated, "creating a personal link")

	eventList := member.Get("/events/" + f.EventID + "/links")
	support.RequireStatus(t, eventList, http.StatusOK, "listing event links")
	if strings.Contains(string(eventList.Body), "my-private-notes") {
		t.Fatalf("a personal link leaked into the event list: %s", eventList.Body)
	}
	if !strings.Contains(string(eventList.Body), "official-rules") {
		t.Fatalf("the event link is missing from the event list: %s", eventList.Body)
	}

	own := member.Get("/me/events/" + f.EventID + "/links")
	support.RequireStatus(t, own, http.StatusOK, "listing own links")
	if !strings.Contains(string(own.Body), "my-private-notes") {
		t.Fatalf("the personal link is missing from the own list: %s", own.Body)
	}
	if strings.Contains(string(own.Body), "official-rules") {
		t.Fatalf("an event link leaked into the personal list: %s", own.Body)
	}
}

func TestPersonalLinkIsInvisibleToEveryoneElse(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	created := member.Post("/me/events/"+f.EventID+"/links", map[string]any{
		"kind": "OTHER", "url": "https://example.org/my-private-notes",
	})
	support.RequireStatus(t, created, http.StatusCreated, "creating a personal link")
	var link struct {
		ID string `json:"id"`
	}
	created.Decode(t, &link)

	support.RequireStatus(t, f.AdminClient.Patch("/me/links/"+link.ID,
		map[string]any{"title": "seen by an administrator"}),
		http.StatusNotFound, "an administrator editing somebody else's personal link")

	support.RequireStatus(t, f.AdminClient.Delete("/me/links/"+link.ID),
		http.StatusNotFound, "an administrator deleting somebody else's personal link")

	outsider := s.Session(t, f.Outsider)
	support.RequireStatus(t, outsider.Patch("/me/links/"+link.ID,
		map[string]any{"title": "seen by an outsider"}),
		http.StatusNotFound, "an outsider editing somebody else's personal link")

	still := member.Get("/me/events/" + f.EventID + "/links")
	if !strings.Contains(string(still.Body), "my-private-notes") {
		t.Fatalf("the owner lost their own link: %s", still.Body)
	}
}

func TestPersonalLinkRejectsExecutableSchemes(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	support.RequireStatus(t, member.Post("/me/events/"+f.EventID+"/links",
		map[string]any{"kind": "OTHER", "url": "javascript:alert(1)"}),
		http.StatusBadRequest, "storing a javascript address as a personal link")

	if countRows(s, t, "participant_links") != 0 {
		t.Fatalf("an executable scheme was stored in participant_links")
	}
}
