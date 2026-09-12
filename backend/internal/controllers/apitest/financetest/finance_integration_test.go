//go:build integration

package financetest_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func start24h() time.Time {
	return time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)
}

type financeSummary struct {
	PrizePool         *string `json:"prize_pool"`
	DistributedTracks string  `json:"distributed_tracks"`
	DistributedCases  string  `json:"distributed_cases"`
	Distributed       string  `json:"distributed"`
	Discrepancy       *string `json:"discrepancy"`
	DiscrepancyKnown  bool    `json:"discrepancy_known"`
	Cases             []struct {
		ID          string  `json:"id"`
		Name        string  `json:"name"`
		TrackName   *string `json:"track_name"`
		PrizeAmount *string `json:"prize_amount"`
	} `json:"cases"`
}

func fundedEvent(t *testing.T, f support.Fixture) (string, string) {
	t.Helper()
	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+f.EventID,
		map[string]any{"prize_pool": "10000", "prize_currency": "USD"}),
		http.StatusOK, "declaring a prize pool")

	resp := f.AdminClient.Post("/admin/events/"+f.EventID+"/tracks", map[string]any{
		"name":   "Voice agents",
		"prizes": []map[string]any{{"place": 1, "amount": "6000"}},
	})
	support.RequireStatus(t, resp, http.StatusCreated, "creating a track")
	var track struct {
		ID string `json:"id"`
	}
	resp.Decode(t, &track)
	return f.EventID, track.ID
}

func summaryOf(t *testing.T, c *support.Client, eventID string) financeSummary {
	t.Helper()
	resp := c.Get("/events/" + eventID + "/finance")
	support.RequireStatus(t, resp, http.StatusOK, "reading the finance summary")
	var out financeSummary
	resp.Decode(t, &out)
	return out
}

func TestFinanceDiscrepancyCountsCasePrizesAlongsideTrackPrizes(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	eventID, trackID := fundedEvent(t, f)

	before := summaryOf(t, f.AdminClient, eventID)
	if before.DistributedTracks != "6000" || before.DistributedCases != "0" {
		t.Fatalf("before any case: tracks %q cases %q, want 6000 and 0",
			before.DistributedTracks, before.DistributedCases)
	}
	if before.Discrepancy == nil || *before.Discrepancy != "4000" {
		t.Fatalf("before any case the discrepancy is %v, want 4000", before.Discrepancy)
	}

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+eventID+"/cases",
		map[string]any{
			"name": "Barge-in handling", "partner": "Harbour", "prize_amount": "1500",
			"track_id": trackID,
		}), http.StatusCreated, "creating a funded case")

	after := summaryOf(t, f.AdminClient, eventID)
	if after.DistributedCases != "1500" {
		t.Fatalf("distributed_cases = %q, want 1500", after.DistributedCases)
	}
	if after.Distributed != "7500" {
		t.Fatalf("distributed = %q, want 7500", after.Distributed)
	}
	if after.Discrepancy == nil || *after.Discrepancy != "2500" {
		t.Fatalf("discrepancy = %v, want 2500: a case prize must reduce it", after.Discrepancy)
	}
	if len(after.Cases) != 1 || after.Cases[0].TrackName == nil ||
		*after.Cases[0].TrackName != "Voice agents" {
		t.Fatalf("the case did not carry its track name: %+v", after.Cases)
	}
}

func TestFinanceAcceptsACaseWithNeitherTrackNorPrize(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	eventID, _ := fundedEvent(t, f)

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+eventID+"/cases",
		map[string]any{"name": "Crawl budget research"}),
		http.StatusCreated, "creating a case with only a name")

	out := summaryOf(t, f.AdminClient, eventID)
	if out.DistributedCases != "0" {
		t.Fatalf("an unfunded case moved distributed_cases to %q", out.DistributedCases)
	}
	if len(out.Cases) != 1 {
		t.Fatalf("the unfunded case is missing from the summary: %+v", out.Cases)
	}
	if out.Cases[0].PrizeAmount != nil || out.Cases[0].TrackName != nil {
		t.Fatalf("an unfunded, trackless case invented a prize or a track: %+v", out.Cases[0])
	}
}

func TestFinanceWithoutAPoolReportsNoDiscrepancy(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	out := summaryOf(t, f.AdminClient, f.OtherEvent)
	if out.DiscrepancyKnown {
		t.Fatal("discrepancy_known is true for an event that declares no pool")
	}
	if out.Discrepancy != nil {
		t.Fatalf("discrepancy = %v, want none without a declared pool", out.Discrepancy)
	}
}

func TestFinanceFollowsTheSameAccessRulesAsTracks(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	unpublished := f.AdminClient.CreateEvent(t, "Draft event", start24h())
	for _, path := range []string{"/finance", "/cases", "/finance/export"} {
		support.RequireStatus(t, s.Session(t, f.Outsider).Get("/events/"+unpublished+path),
			http.StatusNotFound, "reading "+path+" of an unpublished event as an outsider")
		support.RequireStatus(t, f.AdminClient.Get("/events/"+unpublished+path),
			http.StatusOK, "reading "+path+" of an unpublished event as an administrator")
		support.RequireStatus(t, s.Session(t, f.Member).Get("/events/"+f.EventID+path),
			http.StatusOK, "reading "+path+" of a published event as a member")
	}

	support.RequireStatus(t, s.Session(t, f.Member).Post("/admin/events/"+f.EventID+"/cases",
		map[string]any{"name": "Sneaky"}), http.StatusForbidden,
		"creating a case as a member")
}

func TestFinanceExportCarriesEveryRowAndTheReconciliation(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	eventID, trackID := fundedEvent(t, f)

	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+eventID+"/cases",
		map[string]any{
			"name": "Barge-in handling", "partner": "Harbour", "prize_amount": "1500",
			"track_id": trackID,
		}), http.StatusCreated, "creating a funded case")

	resp := f.AdminClient.Get("/events/" + eventID + "/finance/export")
	support.RequireStatus(t, resp, http.StatusOK, "exporting the reconciliation")
	if got := resp.Header.Get("Content-Type"); !strings.HasPrefix(got, "text/csv") {
		t.Fatalf("Content-Type = %q, want text/csv", got)
	}
	if got := resp.Header.Get("Content-Disposition"); !strings.Contains(got, "finance.csv") {
		t.Fatalf("Content-Disposition = %q, want it to name finance.csv", got)
	}

	body := string(resp.Body)
	for _, want := range []string{
		"TRACK_PRIZE,Voice agents,place 1,,6000,USD",
		"CASE,Voice agents,Barge-in handling,Harbour,1500,USD",
		"TOTAL,,distributed_cases,,1500,USD",
		"TOTAL,,discrepancy,,2500,USD",
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("the export is missing the row %q:\n%s", want, body)
		}
	}
}
