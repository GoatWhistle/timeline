package validation

import (
	"errors"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestShortcutsNormalizesCaseAndSpacing(t *testing.T) {
	cleaned, err := Shortcuts(models.Shortcuts{
		"  command-palette  ": "Mod+K",
		"goto-events":         "g   E",
	})
	if err != nil {
		t.Fatalf("expected the map to be accepted, got %v", err)
	}
	if cleaned["command-palette"] != "mod+k" {
		t.Fatalf("expected mod+k, got %q", cleaned["command-palette"])
	}
	if cleaned["goto-events"] != "g e" {
		t.Fatalf("expected the chord to collapse to a single space, got %q", cleaned["goto-events"])
	}
}

func TestShortcutsRejectsCombinationsOwnedByTheBrowserOrSystem(t *testing.T) {
	reserved := []string{"mod+w", "mod+t", "mod+q", "mod+n", "tab", "escape", "f5", "f11", "mod+shift+w"}
	for _, combo := range reserved {
		t.Run(combo, func(t *testing.T) {
			_, err := Shortcuts(models.Shortcuts{"command-palette": combo})
			if err == nil {
				t.Fatalf("%q was accepted; the user would lose the key to the browser", combo)
			}
			var domain *models.DomainError
			if !errors.As(err, &domain) || domain.Code != "shortcut_reserved" {
				t.Fatalf("expected shortcut_reserved, got %v", err)
			}
		})
	}
}

func TestShortcutsRejectsAReservedStepInsideAChord(t *testing.T) {
	if _, err := Shortcuts(models.Shortcuts{"goto-events": "g mod+w"}); err == nil {
		t.Fatal("a chord ending in a browser combination was accepted")
	}
}

func TestShortcutsRejectsTwoActionsClaimingTheSameCombination(t *testing.T) {
	_, err := Shortcuts(models.Shortcuts{"command-palette": "mod+j", "shortcut-help": "Mod+J"})
	if err == nil {
		t.Fatal("two actions were allowed to claim the same shortcut")
	}
	var domain *models.DomainError
	if !errors.As(err, &domain) || domain.Code != "shortcut_conflict" {
		t.Fatalf("expected shortcut_conflict, got %v", err)
	}
}

func TestShortcutsRejectsMalformedCombinations(t *testing.T) {
	malformed := []string{"", "mod+", "+k", "shift+mod+k", "mod+notakey", "a b c", "mod+K K"}
	for _, combo := range malformed {
		t.Run(combo, func(t *testing.T) {
			if _, err := Shortcuts(models.Shortcuts{"command-palette": combo}); err == nil {
				t.Fatalf("malformed shortcut %q was accepted", combo)
			}
		})
	}
}

func TestShortcutsRejectsAnEmptyActionAndTooManyActions(t *testing.T) {
	if _, err := Shortcuts(models.Shortcuts{"   ": "mod+j"}); err == nil {
		t.Fatal("an empty action identifier was accepted")
	}
	many := make(models.Shortcuts, models.ShortcutMaxActions+1)
	for index := 0; index <= models.ShortcutMaxActions; index++ {
		many["action-"+Itoa(index)] = "g " + string(rune('a'+index%26))
	}
	if _, err := Shortcuts(many); err == nil {
		t.Fatal("an oversized override map was accepted")
	}
}

func TestShortcutsAcceptsAnEmptyMapAsAFullReset(t *testing.T) {
	cleaned, err := Shortcuts(models.Shortcuts{})
	if err != nil {
		t.Fatalf("expected an empty map to be accepted, got %v", err)
	}
	if len(cleaned) != 0 {
		t.Fatalf("expected no overrides, got %d", len(cleaned))
	}
}
