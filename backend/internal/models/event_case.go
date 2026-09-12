package models

import (
	"time"

	"github.com/google/uuid"
)

type EventCase struct {
	ID          uuid.UUID  `json:"id"`
	DisplayID   string     `json:"display_id"`
	EventID     uuid.UUID  `json:"event_id"`
	TrackID     *uuid.UUID `json:"track_id,omitempty"`
	CaseNo      int        `json:"case_no"`
	Name        string     `json:"name"`
	Description *string    `json:"description,omitempty"`
	Partner     *string    `json:"partner,omitempty"`
	PrizeAmount *string    `json:"prize_amount,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (c *EventCase) Funded() bool { return c.PrizeAmount != nil }

type EventCasePatch struct {
	Name        *string
	Description *string
	Partner     *string
	PrizeAmount *string
	TrackID     *uuid.UUID
	CaseNo      *int
	ClearTrack  bool
	ClearPrize  bool
}
