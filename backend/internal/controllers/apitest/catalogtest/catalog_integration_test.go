//go:build integration

package catalogtest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func catalogTitles(items []support.CatalogItem) map[string]support.CatalogItem {
	out := make(map[string]support.CatalogItem, len(items))
	for _, item := range items {
		out[item.Title] = item
	}
	return out
}

func TestCatalogShowsOnlyPublishedEventsWithoutNotes(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	unpublished := f.AdminClient.CreateEvent(t, "Unpublished draft", start)
	archived := f.AdminClient.CreateEvent(t, "Archived event", start)
	f.AdminClient.Publish(t, archived)
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+archived+"/archive", nil),
		http.StatusOK, "archiving the event")

	for _, reader := range []*support.Client{s.Session(t, f.Outsider), f.AdminClient} {
		items := support.Catalog(t, reader, "page_size=100")
		byTitle := catalogTitles(items)
		if _, ok := byTitle["Unpublished draft"]; ok {
			t.Fatalf("the catalog exposed the unpublished event %s", unpublished)
		}
		if _, ok := byTitle["Archived event"]; ok {
			t.Fatalf("the catalog exposed the archived event %s", archived)
		}
		if _, ok := byTitle["Member event"]; !ok {
			t.Fatalf("the catalog hid a published event from a reader: %v", byTitle)
		}
	}

	resp := s.Session(t, f.Outsider).Get("/catalog?page_size=100")
	support.RequireStatus(t, resp, http.StatusOK, "the outsider reads the catalog")
	support.RequireNoBodyField(t, resp, "notes", "the catalog")
}

func TestCatalogOriginViewsCoverEveryEvent(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	world := f.AdminClient.CreateEvent(t, "World event", start)
	support.SetEventTaxonomy(t, f.AdminClient, world, map[string]any{"origin": "WORLD"})
	f.AdminClient.Publish(t, world)

	reader := s.Session(t, f.Outsider)

	russia := catalogTitles(support.Catalog(t, reader, "origin=RU&page_size=100"))
	if _, ok := russia["Member event"]; !ok {
		t.Fatalf("the Russia view lost the default-origin event: %v", russia)
	}
	if _, ok := russia["World event"]; ok {
		t.Fatalf("the Russia view returned a WORLD event: %v", russia)
	}

	global := catalogTitles(support.Catalog(t, reader, "origin=WORLD&page_size=100"))
	if _, ok := global["World event"]; !ok {
		t.Fatalf("the World view lost the WORLD event: %v", global)
	}
	if _, ok := global["Member event"]; ok {
		t.Fatalf("the World view returned an RU event: %v", global)
	}

	all := catalogTitles(support.Catalog(t, reader, "page_size=100"))
	for _, title := range []string{"Member event", "World event"} {
		if _, ok := all[title]; !ok {
			t.Fatalf("the All view lost %q: %v", title, all)
		}
	}
	if len(russia)+len(global) != len(all) {
		t.Fatalf("the two views do not partition the All view: %d + %d against %d",
			len(russia), len(global), len(all))
	}
}

func TestCatalogOfflineFilterMatchesStagesNotOnlyTheEvent(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	hybrid := f.AdminClient.CreateEvent(t, "Online with an offline final", start)
	f.AdminClient.Publish(t, hybrid)
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+hybrid+"/stages",
		map[string]any{
			"name":         "Final",
			"type":         "DEMO",
			"start_at":     start.Add(24 * time.Hour).Format(time.RFC3339),
			"end_at":       start.Add(30 * time.Hour).Format(time.RFC3339),
			"format":       "OFFLINE",
			"country_code": "RU",
			"city":         "Kazan",
		}), http.StatusCreated, "creating an offline final")

	reader := s.Session(t, f.Outsider)

	offline := catalogTitles(support.Catalog(t, reader, "format=OFFLINE&page_size=100"))
	item, ok := offline["Online with an offline final"]
	if !ok {
		t.Fatalf("the offline filter missed an event whose final is held in person: %v", offline)
	}
	if item.Format != "ONLINE" {
		t.Fatalf("the declared format changed to %q", item.Format)
	}
	if item.EffectiveFormat != "HYBRID" {
		t.Fatalf("the derived format is %q instead of HYBRID", item.EffectiveFormat)
	}
	if len(item.OfflineStages) != 1 {
		t.Fatalf("expected exactly one offline stage, got %d", len(item.OfflineStages))
	}
	place := item.OfflineStages[0].Place
	if place.City == nil || *place.City != "Kazan" {
		t.Fatalf("the offline stage carries no city: %+v", place)
	}
	if place.Inherited {
		t.Fatalf("a stage with its own format must not be marked inherited")
	}

	online := catalogTitles(support.Catalog(t, reader, "format=ONLINE&page_size=100"))
	if _, ok := online["Member event"]; !ok {
		t.Fatalf("the online filter lost a fully online event: %v", online)
	}
}

func TestCatalogStateFilterFollowsTheClock(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	reader := s.Session(t, f.Outsider)

	upcoming := catalogTitles(support.Catalog(t, reader, "state=UPCOMING&page_size=100"))
	if _, ok := upcoming["Member event"]; !ok {
		t.Fatalf("an event starting tomorrow is not UPCOMING: %v", upcoming)
	}
	for title, item := range upcoming {
		if item.State != "UPCOMING" {
			t.Fatalf("the UPCOMING filter returned %q in state %q", title, item.State)
		}
	}

	finished := catalogTitles(support.Catalog(t, reader, "state=FINISHED&page_size=100"))
	if _, ok := finished["Member event"]; ok {
		t.Fatalf("a future event was reported as FINISHED: %v", finished)
	}
}
