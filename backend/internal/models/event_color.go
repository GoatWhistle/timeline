package models

import "time"

const EventColorSlots = 24

type EventColor struct {
	Family string `json:"family" enums:"RU,WORLD"`
	Slot   int    `json:"slot" example:"3"`
}

func (e *Event) Color() *EventColor {
	if e.ColorSlot == nil {
		return nil
	}
	slot := *e.ColorSlot
	if slot < 0 || slot >= EventColorSlots {
		return nil
	}
	return &EventColor{Family: string(e.Origin), Slot: slot}
}

type EventColorClaim struct {
	Slot       int
	AssignedAt time.Time
}

func ValidEventColorSlot(slot int) bool {
	return slot >= 0 && slot < EventColorSlots
}
