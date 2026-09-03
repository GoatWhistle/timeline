//go:build integration

package eventtest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type patchedEvent struct {
	Title         string  `json:"title"`
	Description   *string `json:"description"`
	Organizer     *string `json:"organizer"`
	WebsiteURL    *string `json:"website_url"`
	Kind          string  `json:"kind"`
	Format        string  `json:"format"`
	Origin        string  `json:"origin"`
	CountryCode   *string `json:"country_code"`
	City          *string `json:"city"`
	Track         *string `json:"track"`
	PrizePool     *string `json:"prize_pool"`
	PrizeCurrency *string `json:"prize_currency"`
	TeamSizeMin   *int    `json:"team_size_min"`
	TeamSizeMax   *int    `json:"team_size_max"`
}

func TestEventPatchWritesEveryFieldToItsOwnColumn(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
	id := f.AdminClient.CreateEvent(t, "Event before the patch", start)

	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+id, map[string]any{
		"title":          "Event after the patch",
		"description":    "A description no other field carries",
		"organizer":      "An organiser no other field carries",
		"website_url":    "https://patched.example.com",
		"format":         "HYBRID",
		"origin":         "WORLD",
		"country_code":   "DE",
		"city":           "Berlin",
		"track":          "A track no other field carries",
		"prize_pool":     "1234.56",
		"prize_currency": "EUR",
		"team_size_min":  2,
		"team_size_max":  7,
	}), http.StatusOK, "patching every optional field at once")

	resp := f.AdminClient.Get("/admin/events/" + id)
	support.RequireStatus(t, resp, http.StatusOK, "reading the patched event")
	var got patchedEvent
	resp.Decode(t, &got)

	requireText(t, "title", &got.Title, "Event after the patch")
	requireText(t, "description", got.Description, "A description no other field carries")
	requireText(t, "organizer", got.Organizer, "An organiser no other field carries")
	requireText(t, "website_url", got.WebsiteURL, "https://patched.example.com")
	requireText(t, "kind", &got.Kind, "HACKATHON")
	requireText(t, "format", &got.Format, "HYBRID")
	requireText(t, "origin", &got.Origin, "WORLD")
	requireText(t, "country_code", got.CountryCode, "DE")
	requireText(t, "city", got.City, "Berlin")
	requireText(t, "track", got.Track, "A track no other field carries")
	requireText(t, "prize_pool", got.PrizePool, "1234.56")
	requireText(t, "prize_currency", got.PrizeCurrency, "EUR")
	requireNumber(t, "team_size_min", got.TeamSizeMin, 2)
	requireNumber(t, "team_size_max", got.TeamSizeMax, 7)
}

func requireText(t *testing.T, field string, got *string, want string) {
	t.Helper()
	if got == nil {
		t.Fatalf("%s came back empty, expected %q", field, want)
	}
	if *got != want {
		t.Fatalf("%s came back as %q, expected %q", field, *got, want)
	}
}

func requireNumber(t *testing.T, field string, got *int, want int) {
	t.Helper()
	if got == nil {
		t.Fatalf("%s came back empty, expected %d", field, want)
	}
	if *got != want {
		t.Fatalf("%s came back as %d, expected %d", field, *got, want)
	}
}
