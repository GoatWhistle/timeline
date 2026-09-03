//go:build integration

package eventtest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type kindError struct {
	Error struct {
		Code string `json:"code"`
	} `json:"error"`
}

func TestEventPatchRefusesAChangeOfKindAndLeavesTheEventUntouched(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	id := f.AdminClient.CreateEvent(t, "An event whose kind is fixed", start)

	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+id, map[string]any{
		"title":     "A title that must not be written either",
		"organizer": "An organiser that must not be written either",
	}), http.StatusOK, "seeding the fields the refusal must preserve")

	before := readKindEvent(t, f, id)
	if before.Kind != "HACKATHON" {
		t.Fatalf("the fixture is meant to start as a HACKATHON, got %q", before.Kind)
	}

	resp := f.AdminClient.Patch("/admin/events/"+id, map[string]any{
		"kind":      "MEETUP",
		"title":     "A title the refused patch tried to smuggle in",
		"organizer": "An organiser the refused patch tried to smuggle in",
	})
	support.RequireStatus(t, resp, http.StatusConflict, "patching the kind of an existing event")

	var problem kindError
	resp.Decode(t, &problem)
	if problem.Error.Code != "invalid_state_transition" {
		t.Fatalf("a refused kind change must answer invalid_state_transition, got %q", problem.Error.Code)
	}

	after := readKindEvent(t, f, id)
	if after.Kind != before.Kind {
		t.Fatalf("the refused patch changed kind from %q to %q", before.Kind, after.Kind)
	}
	if after.Title != before.Title {
		t.Fatalf("the refused patch wrote title %q over %q", after.Title, before.Title)
	}
	requireText(t, "organizer after the refusal", after.Organizer, derefText(t, before.Organizer))
}

func TestEventPatchAcceptsTheKindTheEventAlreadyHas(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	id := f.AdminClient.CreateEvent(t, "An event patched with its own kind", start)

	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+id, map[string]any{
		"kind":  "HACKATHON",
		"title": "A title the accepted patch does write",
	}), http.StatusOK, "patching an event with the kind it already has")

	after := readKindEvent(t, f, id)
	requireText(t, "kind", &after.Kind, "HACKATHON")
	requireText(t, "title", &after.Title, "A title the accepted patch does write")
}

func readKindEvent(t *testing.T, f support.Fixture, id string) patchedEvent {
	t.Helper()
	resp := f.AdminClient.Get("/admin/events/" + id)
	support.RequireStatus(t, resp, http.StatusOK, "reading event "+id)
	var got patchedEvent
	resp.Decode(t, &got)
	return got
}

func derefText(t *testing.T, value *string) string {
	t.Helper()
	if value == nil {
		t.Fatal("expected a text value, got none")
	}
	return *value
}
