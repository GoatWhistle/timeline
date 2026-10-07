//go:build integration

package catalogtest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestCatalogEventOpensForAReaderWhoNeverJoined(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	outsider := s.Session(t, f.Outsider)

	foreign, ok := catalogTitles(support.Catalog(t, outsider, "page_size=100"))["Member event"]
	if !ok {
		t.Fatal("the outsider does not see the published event in the catalog")
	}

	resp := outsider.Get("/catalog/" + foreign.ID)
	support.RequireStatus(t, resp, http.StatusOK, "an outsider opening a published event")
	var item support.CatalogItem
	resp.Decode(t, &item)
	if item.ID != foreign.ID || item.Title != "Member event" {
		t.Fatalf("the catalog returned another event: %+v", item)
	}
	if item.TeamRole != nil || item.RegistrationStatus != nil {
		t.Fatalf("an event the outsider never joined carried a participation: %+v", item)
	}
	support.RequireNoBodyField(t, resp, "notes", "the catalog event")

	support.RequireStatus(t, outsider.Get("/events/"+foreign.ID), http.StatusNotFound,
		"the participant card stays private to its participants")
}

func TestCatalogEventHidesWhatTheCatalogHides(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	draft := f.AdminClient.CreateEvent(t, "Unpublished draft", start)
	archived := f.AdminClient.CreateEvent(t, "Archived event", start)
	f.AdminClient.Publish(t, archived)
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+archived+"/archive", nil),
		http.StatusOK, "archiving the event")

	for _, reader := range []*support.Client{s.Session(t, f.Outsider), f.AdminClient} {
		support.RequireStatus(t, reader.Get("/catalog/"+draft), http.StatusNotFound,
			"an unpublished event through the catalog")
		support.RequireStatus(t, reader.Get("/catalog/"+archived), http.StatusNotFound,
			"an archived event through the catalog")
		support.RequireStatus(t, reader.Get("/catalog/ev_zzzzzzzzzzzz"), http.StatusNotFound,
			"an unknown event through the catalog")
	}
}

func TestCatalogEventNeedsASession(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)
	joined, ok := catalogTitles(support.Catalog(t, member, "page_size=100"))["Member event"]
	if !ok {
		t.Fatal("the member does not see the joined event in the catalog")
	}

	support.RequireStatus(t, s.Anonymous(t, "/catalog/"+joined.ID), http.StatusUnauthorized,
		"an anonymous request for a catalog event")
}
