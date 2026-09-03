//go:build integration

package eventtest_test

import (
	"net/http"
	"slices"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type organizerSuggestions struct {
	Items []string `json:"items"`
}

const hiddenOrganizer = "An organiser only an unpublished event names"

const shownOrganizer = "An organiser a published event names"

func TestOrganizerSuggestionsNeverNameAnUnpublishedEventToAPlainUser(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	hidden := f.AdminClient.CreateEvent(t, "An event kept unpublished", start)
	shown := f.AdminClient.CreateEvent(t, "An event that is published", start)
	setOrganizer(t, f, hidden, hiddenOrganizer)
	setOrganizer(t, f, shown, shownOrganizer)
	f.AdminClient.Publish(t, shown)

	forAdmin := readOrganizers(t, f.AdminClient)
	if !slices.Contains(forAdmin, hiddenOrganizer) {
		t.Fatalf("an administrator must see every organiser, %q was missing from %v",
			hiddenOrganizer, forAdmin)
	}

	member := s.Session(t, f.Member)
	forUser := readOrganizers(t, member)
	if slices.Contains(forUser, hiddenOrganizer) {
		t.Fatalf("a suggestion disclosed the organiser of an unpublished event: %v", forUser)
	}
	if !slices.Contains(forUser, shownOrganizer) {
		t.Fatalf("a published event's organiser must still be suggested, %q was missing from %v",
			shownOrganizer, forUser)
	}
}

func TestOrganizerSuggestionsStopNamingAnArchivedEvent(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	id := f.AdminClient.CreateEvent(t, "An event on its way to the archive", start)
	setOrganizer(t, f, id, hiddenOrganizer)
	f.AdminClient.Publish(t, id)

	member := s.Session(t, f.Member)
	if !slices.Contains(readOrganizers(t, member), hiddenOrganizer) {
		t.Fatal("the fixture is meant to be visible before it is archived")
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+id+"/archive", nil),
		http.StatusOK, "archiving the event")

	if got := readOrganizers(t, member); slices.Contains(got, hiddenOrganizer) {
		t.Fatalf("an archived event still named its organiser to a plain user: %v", got)
	}
}

func TestOrganizerSuggestionsRequireAnAuthenticatedCaller(t *testing.T) {
	s := support.NewStack(t)
	s.Seed(t)

	support.RequireStatus(t, s.Anonymous(t, "/organizers"), http.StatusUnauthorized,
		"asking for organiser suggestions without signing in")
}

func setOrganizer(t *testing.T, f support.Fixture, id, organizer string) {
	t.Helper()
	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+id, map[string]any{
		"organizer": organizer,
	}), http.StatusOK, "naming the organiser of "+id)
}

func readOrganizers(t *testing.T, client *support.Client) []string {
	t.Helper()
	resp := client.Get("/organizers")
	support.RequireStatus(t, resp, http.StatusOK, "reading organiser suggestions")
	var got organizerSuggestions
	resp.Decode(t, &got)
	return got.Items
}
