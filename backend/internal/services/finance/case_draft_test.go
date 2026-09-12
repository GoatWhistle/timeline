package finance

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func TestValidateCaseDraftRequiresOnlyTheName(t *testing.T) {
	draft, err := validateCaseDraft(dto.CreateEventCaseRequest{Name: " Traffic light "})
	if err != nil {
		t.Fatalf("a case with only a name was refused: %v", err)
	}
	if draft.name != "Traffic light" {
		t.Fatalf("name = %q, want the trimmed value", draft.name)
	}
	if draft.prize != nil || draft.partner != nil || draft.description != nil {
		t.Fatal("an omitted field was invented")
	}
}

func TestValidateCaseDraftRejectsAnEmptyName(t *testing.T) {
	for _, name := range []string{"", "   ", strings.Repeat("x", caseNameLimit+1)} {
		if _, err := validateCaseDraft(dto.CreateEventCaseRequest{Name: name}); err == nil {
			t.Fatalf("validateCaseDraft accepted the name %q", name)
		}
	}
}

func TestValidateCaseDraftRejectsAFractionalPrize(t *testing.T) {
	for _, amount := range []string{"100.50", "-5", "abc", ""} {
		_, err := validateCaseDraft(dto.CreateEventCaseRequest{
			Name: "Traffic", PrizeAmount: &amount,
		})
		if err == nil {
			t.Fatalf("validateCaseDraft accepted the prize %q", amount)
		}
	}
}

func TestValidateCaseDraftKeepsAWholePrize(t *testing.T) {
	amount := "50000.00"
	draft, err := validateCaseDraft(dto.CreateEventCaseRequest{
		Name: "Traffic", PrizeAmount: &amount,
	})
	if err != nil {
		t.Fatalf("a whole prize was refused: %v", err)
	}
	if draft.prize == nil || *draft.prize != "50000" {
		t.Fatalf("prize = %v, want 50000", draft.prize)
	}
}

func TestValidateCasePatchClearsThePrizeOnlyOnDemand(t *testing.T) {
	amount := "1000"
	patch, err := validateCasePatch(dto.UpdateEventCaseRequest{
		PrizeAmount: &amount, ClearPrize: true,
	})
	if err != nil {
		t.Fatalf("validateCasePatch returned %v", err)
	}
	if !patch.ClearPrize {
		t.Fatal("clear_prize was dropped from the patch")
	}
	if patch.PrizeAmount != nil {
		t.Fatalf("prize_amount = %v, want none when clear_prize is set", patch.PrizeAmount)
	}
}

func TestValidateCaseNoRejectsAnOutOfRangeNumber(t *testing.T) {
	for _, value := range []int{0, -1, caseNoLimit + 1} {
		if err := validateCaseNo(&value); err == nil {
			t.Fatalf("validateCaseNo accepted %d", value)
		}
	}
}
