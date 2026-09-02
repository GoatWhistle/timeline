package models_test

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func slot(v int) *int { return &v }

func TestColourIsNamedByTheFamilyTheEventBelongsTo(t *testing.T) {
	for _, origin := range []models.EventOrigin{models.OriginRU, models.OriginWorld} {
		event := models.Event{Origin: origin, ColorSlot: slot(4)}
		colour := event.Color()
		if colour == nil {
			t.Fatalf("%s lost its colour", origin)
		}
		if colour.Family != string(origin) {
			t.Fatalf("%s was painted as %s", origin, colour.Family)
		}
		if colour.Slot != 4 {
			t.Fatalf("slot 4 came back as %d", colour.Slot)
		}
	}
}

func TestAnEventWithoutASlotCarriesNoColour(t *testing.T) {
	event := models.Event{Origin: models.OriginRU}
	if colour := event.Color(); colour != nil {
		t.Fatalf("a colourless event reported %v", colour)
	}
}

func TestASlotOutsideThePaletteIsRefusedRatherThanPassedOn(t *testing.T) {
	for _, value := range []int{-1, models.EventColorSlots, models.EventColorSlots + 5} {
		event := models.Event{Origin: models.OriginRU, ColorSlot: slot(value)}
		if colour := event.Color(); colour != nil {
			t.Fatalf("slot %d escaped as %v, the client would look up a token that is not there",
				value, colour)
		}
		if models.ValidEventColorSlot(value) {
			t.Fatalf("slot %d was called valid", value)
		}
	}
}

func TestEveryPaletteSlotIsAccepted(t *testing.T) {
	for value := 0; value < models.EventColorSlots; value++ {
		if !models.ValidEventColorSlot(value) {
			t.Fatalf("slot %d was refused although the palette holds %d",
				value, models.EventColorSlots)
		}
		event := models.Event{Origin: models.OriginWorld, ColorSlot: slot(value)}
		if event.Color() == nil {
			t.Fatalf("slot %d produced no colour", value)
		}
	}
}
