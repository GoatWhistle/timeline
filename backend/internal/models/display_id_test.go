package models

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestParseDisplayIDAcceptsAWellFormedIdentifier(t *testing.T) {
	got, err := ParseDisplayID(DisplayKindEvent, "ev_gma9hq8a96q5")
	if err != nil {
		t.Fatalf("a well-formed identifier was rejected: %v", err)
	}
	if got.Value != "ev_gma9hq8a96q5" {
		t.Fatalf("value = %q, want %q", got.Value, "ev_gma9hq8a96q5")
	}
	if got.Kind != DisplayKindEvent {
		t.Fatalf("kind = %+v, want %+v", got.Kind, DisplayKindEvent)
	}
}

func TestParseDisplayIDRejectsAnotherKindsPrefix(t *testing.T) {
	_, err := ParseDisplayID(DisplayKindEvent, "st_gma9hq8a96q5")
	if err == nil {
		t.Fatal("a stage identifier was accepted where an event was expected")
	}
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("error = %v, want a validation error", err)
	}
	if !strings.Contains(err.Error(), "ev_") {
		t.Fatalf("the message does not name the expected prefix: %v", err)
	}
}

func TestParseDisplayIDRejectsALookalikeCharacter(t *testing.T) {
	for _, raw := range []string{
		"ev_0ma9hq8a96q5",
		"ev_1ma9hq8a96q5",
		"ev_lma9hq8a96q5",
		"ev_Oma9hq8a96q5",
		"ev_ima9hq8a96q5",
	} {
		if _, err := ParseDisplayID(DisplayKindEvent, raw); err == nil {
			t.Fatalf("%q contains a lookalike character and was accepted", raw)
		}
	}
}

func TestParseDisplayIDRejectsAWrongLength(t *testing.T) {
	for _, raw := range []string{"ev_", "ev_abc", "ev_gma9hq8a96q55", "ev_gma9hq8a96q"} {
		if _, err := ParseDisplayID(DisplayKindEvent, raw); err == nil {
			t.Fatalf("%q has the wrong length and was accepted", raw)
		}
	}
}

func TestParseDisplayIDRejectsAUUID(t *testing.T) {
	_, err := ParseDisplayID(DisplayKindEvent, "3f1c1e6e-0b0e-4a2b-9c1a-7d1f1f5a1c11")
	if err == nil {
		t.Fatal("a raw UUID was accepted as a display identifier")
	}
}

func TestParseDisplayIDRejectsAnUppercaseIdentifier(t *testing.T) {
	if _, err := ParseDisplayID(DisplayKindEvent, "EV_GMA9HQ8A96Q5"); err == nil {
		t.Fatal("an uppercase identifier was accepted")
	}
}

func TestParseDisplayIDRejectsTheEmptyValue(t *testing.T) {
	if _, err := ParseDisplayID(DisplayKindEvent, ""); err == nil {
		t.Fatal("the empty value was accepted")
	}
}

func TestDisplayIDMarshalsAsAPlainString(t *testing.T) {
	raw, err := json.Marshal(NewDisplayID(DisplayKindEvent, "ev_gma9hq8a96q5"))
	if err != nil {
		t.Fatalf("marshalling failed: %v", err)
	}
	if string(raw) != `"ev_gma9hq8a96q5"` {
		t.Fatalf("marshalled to %s, want a plain string", raw)
	}
}

func TestDisplayAlphabetCarriesNoLookalikes(t *testing.T) {
	for _, r := range "0O1lI" {
		if strings.ContainsRune(displayAlphabet, r) {
			t.Fatalf("the alphabet contains the lookalike %q", string(r))
		}
	}
}
