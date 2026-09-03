package event

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func TestParseWholeAmountRejectsKopecks(t *testing.T) {
	for _, value := range []string{"100.50", "0.01", "1.005", "-5", "abc", "", "1e3"} {
		if _, err := parseWholeAmount("amount", value); err == nil {
			t.Fatalf("parseWholeAmount(%q) accepted a value it must refuse", value)
		}
	}
}

func TestParseWholeAmountAcceptsWholeNumbers(t *testing.T) {
	cases := map[string]int64{"0": 0, "150000": 150000, "150000.00": 150000, " 42 ": 42}
	for value, want := range cases {
		got, err := parseWholeAmount("amount", value)
		if err != nil {
			t.Fatalf("parseWholeAmount(%q) returned %v", value, err)
		}
		if got != want {
			t.Fatalf("parseWholeAmount(%q) = %d, want %d", value, got, want)
		}
	}
}

func TestValidatePrizeInputsRejectsDuplicatePlace(t *testing.T) {
	_, _, err := validatePrizeInputs([]dto.TrackPrizeInput{
		{Place: 1, Amount: "100"},
		{Place: 1, Amount: "50"},
	})
	if err == nil {
		t.Fatal("two prizes for place 1 were accepted")
	}
	if !strings.Contains(err.Error(), "duplicate") {
		t.Fatalf("unexpected error for a duplicate place: %v", err)
	}
}

func TestValidatePrizeInputsRejectsPlaceOutOfRange(t *testing.T) {
	for _, place := range []int{0, -1, trackPlaceLimit + 1} {
		if _, _, err := validatePrizeInputs([]dto.TrackPrizeInput{
			{Place: place, Amount: "100"},
		}); err == nil {
			t.Fatalf("place %d was accepted", place)
		}
	}
}

func TestValidatePrizeInputsSumsUnequalPlaceCounts(t *testing.T) {
	prizes, total, err := validatePrizeInputs([]dto.TrackPrizeInput{
		{Place: 1, Amount: "3000"},
		{Place: 2, Amount: "1500"},
		{Place: 3, Amount: "800"},
	})
	if err != nil {
		t.Fatalf("a three-place track was refused: %v", err)
	}
	if total != 5300 {
		t.Fatalf("total = %d, want 5300", total)
	}
	if len(prizes) != 3 {
		t.Fatalf("len(prizes) = %d, want 3", len(prizes))
	}
	if prizes[0].Amount != "3000" {
		t.Fatalf("prizes[0].Amount = %q, want \"3000\"", prizes[0].Amount)
	}
}

func TestCheckPoolCoverageRefusesOverBudgetSplit(t *testing.T) {
	pool := "10000"
	err := checkPoolCoverage(&pool, "6000", 4001)
	if err == nil {
		t.Fatal("a split of 6000 + 4001 against a pool of 10000 was accepted")
	}
	if !strings.Contains(err.Error(), "exceed") {
		t.Fatalf("unexpected error for an over-budget split: %v", err)
	}
}

func TestCheckPoolCoverageAcceptsExactFit(t *testing.T) {
	pool := "10000"
	if err := checkPoolCoverage(&pool, "6000", 4000); err != nil {
		t.Fatalf("a split that exactly fills the pool was refused: %v", err)
	}
}

func TestCheckPoolCoverageRefusesPrizesWithoutPool(t *testing.T) {
	if err := checkPoolCoverage(nil, "0", 1); err == nil {
		t.Fatal("a prize was accepted on an event with no prize pool")
	}
	if err := checkPoolCoverage(nil, "0", 0); err != nil {
		t.Fatalf("an empty split on an event with no pool was refused: %v", err)
	}
}

func TestCheckPoolCoverageCountsOtherTracks(t *testing.T) {
	pool := "10000"
	if err := checkPoolCoverage(&pool, "0", 9000); err != nil {
		t.Fatalf("the only track was refused: %v", err)
	}
	if err := checkPoolCoverage(&pool, "9000", 1001); err == nil {
		t.Fatal("a second track was allowed to push the total past the pool")
	}
}

func TestValidateTrackNoRange(t *testing.T) {
	for _, value := range []int{0, -1, trackNoLimit + 1} {
		candidate := value
		if err := validateTrackNo(&candidate); err == nil {
			t.Fatalf("track_no %d was accepted", value)
		}
	}
	valid := 1
	if err := validateTrackNo(&valid); err != nil {
		t.Fatalf("track_no 1 was refused: %v", err)
	}
	if err := validateTrackNo(nil); err != nil {
		t.Fatalf("an absent track_no was refused: %v", err)
	}
}
