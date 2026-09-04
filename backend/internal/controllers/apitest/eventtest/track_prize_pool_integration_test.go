//go:build integration

package eventtest_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

type trackListEnvelope struct {
	Items []struct {
		ID      string `json:"id"`
		TrackNo int    `json:"track_no"`
		Name    string `json:"name"`
	} `json:"items"`
	PrizePool   *string `json:"prize_pool"`
	Distributed string  `json:"distributed"`
	Unallocated *string `json:"unallocated"`
}

type poolError struct {
	Error struct {
		Code string `json:"code"`
	} `json:"error"`
}

func TestLoweringThePrizePoolBelowTheDistributedPrizesIsRefused(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	id := createPrizedEvent(t, f, "An event whose pool must keep covering its tracks", "100000")
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+id+"/tracks", map[string]any{
		"name":   "A track holding most of the pool",
		"prizes": []map[string]any{{"place": 1, "amount": "90000"}},
	}), http.StatusCreated, "creating the track that consumes the pool")

	resp := f.AdminClient.Patch("/admin/events/"+id, map[string]any{"prize_pool": "1000"})
	support.RequireStatus(t, resp, http.StatusBadRequest,
		"lowering the prize pool under the distributed prizes")
	var problem poolError
	resp.Decode(t, &problem)
	if problem.Error.Code != "validation_failed" {
		t.Fatalf("a refused pool must answer validation_failed, got %q", problem.Error.Code)
	}

	after := readTracks(t, f, id)
	if after.PrizePool == nil || *after.PrizePool != "100000" {
		t.Fatalf("the refused patch wrote the pool: %v", after.PrizePool)
	}
	if after.Unallocated == nil || *after.Unallocated != "10000" {
		t.Fatalf("unallocated must stay at 10000, got %v", after.Unallocated)
	}
}

func TestThePrizePoolMayBeLoweredToExactlyWhatIsDistributed(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	id := createPrizedEvent(t, f, "An event lowered to the exact distributed sum", "100000")
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+id+"/tracks", map[string]any{
		"name":   "A track holding ninety thousand",
		"prizes": []map[string]any{{"place": 1, "amount": "90000"}},
	}), http.StatusCreated, "creating the track that consumes the pool")

	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+id,
		map[string]any{"prize_pool": "90000"}), http.StatusOK,
		"lowering the pool to exactly the distributed sum")

	after := readTracks(t, f, id)
	if after.Unallocated == nil || *after.Unallocated != "0" {
		t.Fatalf("unallocated must be 0 at the boundary, got %v", after.Unallocated)
	}
}

func TestATrackTakesTheNumberItIsGivenAndSwapsWithWhoeverHeldIt(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	id := createPrizedEvent(t, f, "An event whose tracks are reordered", "")
	first := createTrack(t, f, id, "First")
	second := createTrack(t, f, id, "Second")
	third := createTrack(t, f, id, "Third")

	requireOrder(t, readTracks(t, f, id), []string{"First", "Second", "Third"})

	support.RequireStatus(t, f.AdminClient.Patch("/admin/tracks/"+second,
		map[string]any{"track_no": 1}), http.StatusOK,
		"moving the second track into the first slot")
	requireOrder(t, readTracks(t, f, id), []string{"Second", "First", "Third"})

	support.RequireStatus(t, f.AdminClient.Patch("/admin/tracks/"+third,
		map[string]any{"track_no": 1}), http.StatusOK,
		"moving the third track into the first slot across a gap")
	requireOrder(t, readTracks(t, f, id), []string{"Third", "First", "Second"})

	support.RequireStatus(t, f.AdminClient.Patch("/admin/tracks/"+first,
		map[string]any{"track_no": 9}), http.StatusOK,
		"moving a track into a free slot")
	requireOrder(t, readTracks(t, f, id), []string{"Third", "Second", "First"})

	support.RequireStatus(t, f.AdminClient.Patch("/admin/tracks/"+first,
		map[string]any{"track_no": 9}), http.StatusOK,
		"moving a track to the number it already has")
	requireOrder(t, readTracks(t, f, id), []string{"Third", "Second", "First"})
}

func createPrizedEvent(t *testing.T, f support.Fixture, title, pool string) string {
	t.Helper()
	start := time.Now().UTC().Add(96 * time.Hour).Truncate(time.Second)
	body := map[string]any{
		"title":    title,
		"kind":     "HACKATHON",
		"start_at": start.Format(time.RFC3339),
		"end_at":   start.Add(48 * time.Hour).Format(time.RFC3339),
	}
	if pool != "" {
		body["prize_pool"] = pool
		body["prize_currency"] = "USD"
	}
	resp := f.AdminClient.Post("/admin/events", body)
	support.RequireStatus(t, resp, http.StatusCreated, "creating "+title)
	var created struct {
		ID string `json:"id"`
	}
	resp.Decode(t, &created)
	return created.ID
}

func createTrack(t *testing.T, f support.Fixture, eventID, name string) string {
	t.Helper()
	resp := f.AdminClient.Post("/admin/events/"+eventID+"/tracks", map[string]any{"name": name})
	support.RequireStatus(t, resp, http.StatusCreated, "creating track "+name)
	var created struct {
		ID string `json:"id"`
	}
	resp.Decode(t, &created)
	return created.ID
}

func readTracks(t *testing.T, f support.Fixture, eventID string) trackListEnvelope {
	t.Helper()
	resp := f.AdminClient.Get("/events/" + eventID + "/tracks")
	support.RequireStatus(t, resp, http.StatusOK, "listing the tracks of "+eventID)
	var out trackListEnvelope
	resp.Decode(t, &out)
	return out
}

func requireOrder(t *testing.T, list trackListEnvelope, want []string) {
	t.Helper()
	if len(list.Items) != len(want) {
		t.Fatalf("expected %d tracks, got %d", len(want), len(list.Items))
	}
	seen := make(map[int]struct{}, len(list.Items))
	for i, item := range list.Items {
		if item.Name != want[i] {
			t.Fatalf("track at position %d is %q, expected %q", i+1, item.Name, want[i])
		}
		if _, duplicate := seen[item.TrackNo]; duplicate {
			t.Fatalf("track_no %d is held twice", item.TrackNo)
		}
		seen[item.TrackNo] = struct{}{}
	}
}
