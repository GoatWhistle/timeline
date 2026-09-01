package auth

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func TestSessionLabelTreatsBlankAsAbsent(t *testing.T) {
	for _, value := range []string{"", "   ", "\t\n"} {
		label, err := validation.SessionLabel(&value)
		if err != nil {
			t.Fatalf("a blank label failed validation: %v", err)
		}
		if label != nil {
			t.Fatalf("a blank label became %q, want nil", *label)
		}
	}
	if label, err := validation.SessionLabel(nil); err != nil || label != nil {
		t.Fatalf("an absent label became %v (%v)", label, err)
	}
}

func TestSessionLabelTrimsAndKeepsTheWrittenText(t *testing.T) {
	label, err := validation.SessionLabel(ptr("  Work laptop  "))
	if err != nil {
		t.Fatalf("a plain label failed validation: %v", err)
	}
	if label == nil || *label != "Work laptop" {
		t.Fatalf("the label became %v, want \"Work laptop\"", label)
	}
}

func TestSessionLabelRefusesMoreThanTheColumnHolds(t *testing.T) {
	longest := strings.Repeat("a", models.SessionLabelMaxLength)
	if _, err := validation.SessionLabel(&longest); err != nil {
		t.Fatalf("a label of exactly the maximum length was refused: %v", err)
	}

	tooLong := strings.Repeat("a", models.SessionLabelMaxLength+1)
	if _, err := validation.SessionLabel(&tooLong); err == nil {
		t.Fatalf("a label of %d characters was accepted; the column holds %d",
			len(tooLong), models.SessionLabelMaxLength)
	}
}

func TestSessionLabelCountsRunesNotBytes(t *testing.T) {
	cyrillic := strings.Repeat("\u044f", models.SessionLabelMaxLength)
	if _, err := validation.SessionLabel(&cyrillic); err != nil {
		t.Fatalf("a label of %d runes was refused although the limit is %d: %v",
			models.SessionLabelMaxLength, models.SessionLabelMaxLength, err)
	}
}

func TestSessionPatchClearsTheLabelOnlyWhenAsked(t *testing.T) {
	patch, err := validation.SessionPatch(dto.UpdateSessionRequest{ClearLabel: true})
	if err != nil {
		t.Fatalf("clearing the label failed: %v", err)
	}
	if !patch.LabelSet || patch.Label != nil {
		t.Fatalf("clear_label did not produce an empty label: %+v", patch)
	}

	patch, err = validation.SessionPatch(dto.UpdateSessionRequest{})
	if err != nil {
		t.Fatalf("an empty request failed validation: %v", err)
	}
	if patch.LabelSet {
		t.Fatalf("an untouched label was marked for change: %+v", patch)
	}
}

func TestSessionPatchPrefersClearOverAName(t *testing.T) {
	patch, err := validation.SessionPatch(dto.UpdateSessionRequest{
		Label:      ptr("Work laptop"),
		ClearLabel: true,
	})
	if err != nil {
		t.Fatalf("a contradictory request failed validation: %v", err)
	}
	if !patch.LabelSet || patch.Label != nil {
		t.Fatalf("clear_label lost to the label it must override: %+v", patch)
	}
}

func TestSessionPatchStripsControlCharacters(t *testing.T) {
	patch, err := validation.SessionPatch(dto.UpdateSessionRequest{Label: ptr("Work\u0000 laptop")})
	if err != nil {
		t.Fatalf("a label carrying a control character failed validation: %v", err)
	}
	if patch.Label == nil || strings.ContainsRune(*patch.Label, '\u0000') {
		t.Fatalf("a control character survived into %v", patch.Label)
	}
}
