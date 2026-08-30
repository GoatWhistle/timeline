//go:build integration

package apitest_test

import (
	"net/http"
	"testing"
	"time"
)

type catalogItem struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Kind            string `json:"kind"`
	Format          string `json:"format"`
	Origin          string `json:"origin"`
	EffectiveFormat string `json:"effective_format"`
	State           string `json:"state"`
	Joined          bool   `json:"joined"`
	OfflineStages   []struct {
		Name  string `json:"name"`
		Place struct {
			Format    string  `json:"format"`
			City      *string `json:"city"`
			Inherited bool    `json:"inherited"`
		} `json:"place"`
	} `json:"offline_stages"`
}

func (c *client) catalog(t *testing.T, query string) []catalogItem {
	t.Helper()
	path := "/catalog"
	if query != "" {
		path += "?" + query
	}
	resp := c.get(path)
	requireStatus(t, resp, http.StatusOK, "reading the catalog "+query)
	var body struct {
		Items []catalogItem `json:"items"`
	}
	resp.decode(t, &body)
	return body.Items
}

func catalogTitles(items []catalogItem) map[string]catalogItem {
	out := make(map[string]catalogItem, len(items))
	for _, item := range items {
		out[item.Title] = item
	}
	return out
}

func (c *client) setEventTaxonomy(t *testing.T, id string, patch map[string]any) {
	t.Helper()
	requireStatus(t, c.patch("/admin/events/"+id, patch),
		http.StatusOK, "patching event "+id)
}

func TestCatalogShowsOnlyPublishedEventsWithoutNotes(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	unpublished := f.adminClient.createEvent(t, "Unpublished draft", start)
	archived := f.adminClient.createEvent(t, "Archived event", start)
	f.adminClient.publish(t, archived)
	requireStatus(t, f.adminClient.post("/admin/events/"+archived+"/archive", nil),
		http.StatusOK, "archiving the event")

	for _, reader := range []*client{s.session(t, f.outsider), f.adminClient} {
		items := reader.catalog(t, "page_size=100")
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

	resp := s.session(t, f.outsider).get("/catalog?page_size=100")
	requireStatus(t, resp, http.StatusOK, "the outsider reads the catalog")
	requireNoBodyField(t, resp, "notes", "the catalog")
}

func TestCatalogOriginViewsCoverEveryEvent(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	world := f.adminClient.createEvent(t, "World event", start)
	f.adminClient.setEventTaxonomy(t, world, map[string]any{"origin": "WORLD"})
	f.adminClient.publish(t, world)

	reader := s.session(t, f.outsider)

	russia := catalogTitles(reader.catalog(t, "origin=RU&page_size=100"))
	if _, ok := russia["Member event"]; !ok {
		t.Fatalf("the Russia view lost the default-origin event: %v", russia)
	}
	if _, ok := russia["World event"]; ok {
		t.Fatalf("the Russia view returned a WORLD event: %v", russia)
	}

	global := catalogTitles(reader.catalog(t, "origin=WORLD&page_size=100"))
	if _, ok := global["World event"]; !ok {
		t.Fatalf("the World view lost the WORLD event: %v", global)
	}
	if _, ok := global["Member event"]; ok {
		t.Fatalf("the World view returned an RU event: %v", global)
	}

	all := catalogTitles(reader.catalog(t, "page_size=100"))
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
	s := newStack(t)
	f := s.seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	hybrid := f.adminClient.createEvent(t, "Online with an offline final", start)
	f.adminClient.publish(t, hybrid)
	requireStatus(t, f.adminClient.post("/admin/events/"+hybrid+"/stages",
		map[string]any{
			"name":         "Final",
			"type":         "DEMO",
			"start_at":     start.Add(24 * time.Hour).Format(time.RFC3339),
			"end_at":       start.Add(30 * time.Hour).Format(time.RFC3339),
			"format":       "OFFLINE",
			"country_code": "RU",
			"city":         "Kazan",
		}), http.StatusCreated, "creating an offline final")

	reader := s.session(t, f.outsider)

	offline := catalogTitles(reader.catalog(t, "format=OFFLINE&page_size=100"))
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

	online := catalogTitles(reader.catalog(t, "format=ONLINE&page_size=100"))
	if _, ok := online["Member event"]; !ok {
		t.Fatalf("the online filter lost a fully online event: %v", online)
	}
}

func TestCatalogStateFilterFollowsTheClock(t *testing.T) {
	s := newStack(t)
	f := s.seed(t)
	reader := s.session(t, f.outsider)

	upcoming := catalogTitles(reader.catalog(t, "state=UPCOMING&page_size=100"))
	if _, ok := upcoming["Member event"]; !ok {
		t.Fatalf("an event starting tomorrow is not UPCOMING: %v", upcoming)
	}
	for title, item := range upcoming {
		if item.State != "UPCOMING" {
			t.Fatalf("the UPCOMING filter returned %q in state %q", title, item.State)
		}
	}

	finished := catalogTitles(reader.catalog(t, "state=FINISHED&page_size=100"))
	if _, ok := finished["Member event"]; ok {
		t.Fatalf("a future event was reported as FINISHED: %v", finished)
	}
}
