package finance

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func ptr(v string) *string { return &v }

func at(n int) *int { return &n }

func summary() *dto.EventFinanceResponse {
	return &dto.EventFinanceResponse{
		EventID:       "ev_aaaaaaaaaaaa",
		PrizePool:     ptr("500000"),
		PrizeCurrency: ptr("RUB"),
		Tracks: []dto.FinanceTrack{{
			ID: "tr_aaaaaaaaaaaa", TrackNo: 1, Name: "Smart city", PrizeTotal: "400000",
			Prizes: []dto.FinanceTrackPrize{
				{Place: at(1), Amount: "300000"},
				{Title: ptr("Best design"), Amount: "100000"},
			},
		}},
		Cases: []dto.FinanceCase{{
			ID: "cs_aaaaaaaaaaaa", CaseNo: 1, Name: "Traffic",
			Partner: ptr("City"), TrackName: ptr("Smart city"), PrizeAmount: ptr("50000"),
		}},
		DistributedTracks: "400000",
		DistributedCases:  "50000",
		Distributed:       "450000",
		Nominations:       "100000",
		Unallocated:       ptr("100000"),
		Discrepancy:       ptr("50000"),
		DiscrepancyKnown:  true,
	}
}

func find(rows [][]string, section, award string) []string {
	for _, row := range rows {
		if row[0] == section && row[2] == award {
			return row
		}
	}
	return nil
}

func TestExportRowsCarryPlacesNominationsAndCases(t *testing.T) {
	rows := ExportRows(summary())

	if row := find(rows, "TRACK_PRIZE", "place 1"); row == nil || row[4] != "300000" {
		t.Fatalf("the place row is missing or wrong: %v", row)
	}
	if row := find(rows, "TRACK_PRIZE", "Best design"); row == nil || row[4] != "100000" {
		t.Fatalf("the nomination row is missing or wrong: %v", row)
	}
	caseRow := find(rows, "CASE", "Traffic")
	if caseRow == nil {
		t.Fatal("the case row is missing from the export")
	}
	if caseRow[3] != "City" || caseRow[4] != "50000" || caseRow[1] != "Smart city" {
		t.Fatalf("the case row lost partner, track or prize: %v", caseRow)
	}
}

func TestExportRowsEndWithTheReconciliation(t *testing.T) {
	rows := ExportRows(summary())

	for award, want := range map[string]string{
		"prize_pool":         "500000",
		"distributed_tracks": "400000",
		"distributed_cases":  "50000",
		"distributed":        "450000",
		"nominations":        "100000",
		"unallocated":        "100000",
		"discrepancy":        "50000",
	} {
		row := find(rows, "TOTAL", award)
		if row == nil {
			t.Fatalf("the reconciliation has no %q row", award)
		}
		if row[4] != want {
			t.Fatalf("%s = %q, want %q", award, row[4], want)
		}
	}
}
