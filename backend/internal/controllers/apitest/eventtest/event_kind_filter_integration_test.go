//go:build integration

package eventtest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type kindFilterPage struct {
	Items []struct {
		ID   string `json:"id"`
		Kind string `json:"kind"`
	} `json:"items"`
	Meta struct {
		Total int `json:"total"`
	} `json:"meta"`
}

func TestAdminEventListFiltersByKind(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(72 * time.Hour).Truncate(time.Second)
	hackathon := f.AdminClient.CreateEvent(t, "A hackathon the kind filter must exclude", start)
	meetup := f.AdminClient.CreateMeetup(t, "A meetup the kind filter must keep", start)

	meetups := readKindFilterPage(t, f, "/admin/events?kind=MEETUP&page_size=100")
	requireOnlyKind(t, meetups, "MEETUP")
	requireContains(t, meetups, meetup, "the meetup")
	requireExcludes(t, meetups, hackathon, "the hackathon")

	hackathons := readKindFilterPage(t, f, "/admin/events?kind=HACKATHON&page_size=100")
	requireOnlyKind(t, hackathons, "HACKATHON")
	requireContains(t, hackathons, hackathon, "the hackathon")
	requireExcludes(t, hackathons, meetup, "the meetup")

	both := readKindFilterPage(t, f, "/admin/events?kind=HACKATHON,MEETUP&page_size=100")
	requireContains(t, both, hackathon, "the hackathon")
	requireContains(t, both, meetup, "the meetup")

	unfiltered := readKindFilterPage(t, f, "/admin/events?page_size=100")
	requireContains(t, unfiltered, hackathon, "the hackathon")
	requireContains(t, unfiltered, meetup, "the meetup")
}

func readKindFilterPage(t *testing.T, f support.Fixture, path string) kindFilterPage {
	t.Helper()
	resp := f.AdminClient.Get(path)
	support.RequireStatus(t, resp, http.StatusOK, "listing "+path)
	var page kindFilterPage
	resp.Decode(t, &page)
	if page.Meta.Total != len(page.Items) {
		t.Fatalf("%s reported total %d for %d items, widen page_size",
			path, page.Meta.Total, len(page.Items))
	}
	return page
}

func requireOnlyKind(t *testing.T, page kindFilterPage, want string) {
	t.Helper()
	if len(page.Items) == 0 {
		t.Fatalf("the %s filter returned nothing, so it proves nothing", want)
	}
	for _, item := range page.Items {
		if item.Kind != want {
			t.Fatalf("the %s filter returned %s event %s", want, item.Kind, item.ID)
		}
	}
}

func requireContains(t *testing.T, page kindFilterPage, id, what string) {
	t.Helper()
	for _, item := range page.Items {
		if item.ID == id {
			return
		}
	}
	t.Fatalf("%s (%s) is missing from the listing", what, id)
}

func requireExcludes(t *testing.T, page kindFilterPage, id, what string) {
	t.Helper()
	for _, item := range page.Items {
		if item.ID == id {
			t.Fatalf("%s (%s) leaked past the kind filter", what, id)
		}
	}
}
