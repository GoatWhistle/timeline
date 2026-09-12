package finance

import (
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func pool(value string) *models.Event {
	return &models.Event{DisplayID: "ev_aaaaaaaaaaaa", PrizePool: &value}
}

func place(n int) *int { return &n }

func str(v string) *string { return &v }

func trackWith(id uuid.UUID, prizes ...models.TrackPrize) models.EventTrack {
	return models.EventTrack{ID: id, DisplayID: "tr_aaaaaaaaaaaa", TrackNo: 1,
		Name: "Smart city", Prizes: prizes}
}

func TestSummaryDiscrepancyCountsCasePrizes(t *testing.T) {
	trackID := uuid.New()
	target := pool("500000")
	tracks := []models.EventTrack{trackWith(trackID,
		models.TrackPrize{Place: place(1), Amount: "300000"},
		models.TrackPrize{Title: str("Best design"), Amount: "100000"},
	)}
	cases := []models.EventCase{
		{DisplayID: "cs_aaaaaaaaaaaa", CaseNo: 1, Name: "Traffic", PrizeAmount: str("50000")},
		{DisplayID: "cs_bbbbbbbbbbbb", CaseNo: 2, Name: "Research"},
	}

	out := Summary(target, tracks, cases)

	if out.DistributedTracks != "400000" {
		t.Fatalf("distributed_tracks = %q, want 400000", out.DistributedTracks)
	}
	if out.DistributedCases != "50000" {
		t.Fatalf("distributed_cases = %q, want 50000", out.DistributedCases)
	}
	if out.Distributed != "450000" {
		t.Fatalf("distributed = %q, want 450000", out.Distributed)
	}
	if out.Nominations != "100000" {
		t.Fatalf("nominations = %q, want 100000", out.Nominations)
	}
	if out.Unallocated == nil || *out.Unallocated != "100000" {
		t.Fatalf("unallocated = %v, want 100000", out.Unallocated)
	}
	if out.Discrepancy == nil || *out.Discrepancy != "50000" {
		t.Fatalf("discrepancy = %v, want 50000: a case prize must reduce it", out.Discrepancy)
	}
	if !out.DiscrepancyKnown {
		t.Fatal("discrepancy_known = false, want true when the event declares a pool")
	}
}

func TestSummaryReportsOverspendAsNegativeDiscrepancy(t *testing.T) {
	trackID := uuid.New()
	target := pool("100000")
	tracks := []models.EventTrack{trackWith(trackID,
		models.TrackPrize{Place: place(1), Amount: "80000"})}
	cases := []models.EventCase{
		{DisplayID: "cs_aaaaaaaaaaaa", CaseNo: 1, Name: "Traffic", PrizeAmount: str("40000")},
	}

	out := Summary(target, tracks, cases)

	if out.Discrepancy == nil || *out.Discrepancy != "-20000" {
		t.Fatalf("discrepancy = %v, want -20000 for an overspend", out.Discrepancy)
	}
}

func TestSummaryWithoutPoolReportsNoDiscrepancy(t *testing.T) {
	target := &models.Event{DisplayID: "ev_aaaaaaaaaaaa"}
	cases := []models.EventCase{
		{DisplayID: "cs_aaaaaaaaaaaa", CaseNo: 1, Name: "Traffic", PrizeAmount: str("40000")},
	}

	out := Summary(target, nil, cases)

	if out.DiscrepancyKnown {
		t.Fatal("discrepancy_known = true without a declared pool")
	}
	if out.Discrepancy != nil {
		t.Fatalf("discrepancy = %v, want none without a declared pool", out.Discrepancy)
	}
	if out.DistributedCases != "40000" {
		t.Fatalf("distributed_cases = %q, want 40000", out.DistributedCases)
	}
}

func TestSummaryNamesTheTrackOfACase(t *testing.T) {
	trackID := uuid.New()
	target := pool("100000")
	tracks := []models.EventTrack{trackWith(trackID)}
	cases := []models.EventCase{
		{DisplayID: "cs_aaaaaaaaaaaa", CaseNo: 1, Name: "Traffic", TrackID: &trackID},
		{DisplayID: "cs_bbbbbbbbbbbb", CaseNo: 2, Name: "Loose"},
	}

	out := Summary(target, tracks, cases)

	if out.Cases[0].TrackName == nil || *out.Cases[0].TrackName != "Smart city" {
		t.Fatalf("case track_name = %v, want Smart city", out.Cases[0].TrackName)
	}
	if out.Cases[1].TrackName != nil {
		t.Fatalf("case without a track named %v", out.Cases[1].TrackName)
	}
}
