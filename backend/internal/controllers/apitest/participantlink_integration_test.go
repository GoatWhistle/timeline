//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestPersonalLinksStayOutOfTheEventList(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	requireStatus(t, f.adminClient.createLink(t, f.eventID, map[string]any{
		"kind": "RULES", "url": "https://example.org/official-rules",
	}), http.StatusCreated, "creating an event link")

	created := member.post("/me/events/"+f.eventID.String()+"/links", map[string]any{
		"kind": "OTHER", "url": "https://example.org/my-private-notes",
	})
	requireStatus(t, created, http.StatusCreated, "creating a personal link")

	eventList := member.get("/events/" + f.eventID.String() + "/links")
	requireStatus(t, eventList, http.StatusOK, "listing event links")
	if strings.Contains(string(eventList.Body), "my-private-notes") {
		t.Fatalf("a personal link leaked into the event list: %s", eventList.Body)
	}
	if !strings.Contains(string(eventList.Body), "official-rules") {
		t.Fatalf("the event link is missing from the event list: %s", eventList.Body)
	}

	own := member.get("/me/events/" + f.eventID.String() + "/links")
	requireStatus(t, own, http.StatusOK, "listing own links")
	if !strings.Contains(string(own.Body), "my-private-notes") {
		t.Fatalf("the personal link is missing from the own list: %s", own.Body)
	}
	if strings.Contains(string(own.Body), "official-rules") {
		t.Fatalf("an event link leaked into the personal list: %s", own.Body)
	}
}

func TestPersonalLinkIsInvisibleToEveryoneElse(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	created := member.post("/me/events/"+f.eventID.String()+"/links", map[string]any{
		"kind": "OTHER", "url": "https://example.org/my-private-notes",
	})
	requireStatus(t, created, http.StatusCreated, "creating a personal link")
	var link struct {
		ID uuid.UUID `json:"id"`
	}
	created.decode(t, &link)

	requireStatus(t, f.adminClient.patch("/me/links/"+link.ID.String(),
		map[string]any{"title": "seen by an administrator"}),
		http.StatusNotFound, "an administrator editing somebody else's personal link")

	requireStatus(t, f.adminClient.delete("/me/links/"+link.ID.String()),
		http.StatusNotFound, "an administrator deleting somebody else's personal link")

	outsider := s.session(t, f.outsider)
	requireStatus(t, outsider.patch("/me/links/"+link.ID.String(),
		map[string]any{"title": "seen by an outsider"}),
		http.StatusNotFound, "an outsider editing somebody else's personal link")

	still := member.get("/me/events/" + f.eventID.String() + "/links")
	if !strings.Contains(string(still.Body), "my-private-notes") {
		t.Fatalf("the owner lost their own link: %s", still.Body)
	}
}

func TestPersonalLinkRejectsExecutableSchemes(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	member := s.session(t, f.member)

	requireStatus(t, member.post("/me/events/"+f.eventID.String()+"/links",
		map[string]any{"kind": "OTHER", "url": "javascript:alert(1)"}),
		http.StatusBadRequest, "storing a javascript address as a personal link")

	if s.countRows(t, "participant_links") != 0 {
		t.Fatalf("an executable scheme was stored in participant_links")
	}
}
