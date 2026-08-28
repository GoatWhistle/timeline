package models

import (
	"time"

	"github.com/google/uuid"
)

type CatalogEvent struct {
	ID          uuid.UUID   `json:"id"`
	Title       string      `json:"title" example:"National event"`
	Description *string     `json:"description,omitempty"`
	Organizer   *string     `json:"organizer,omitempty" example:"Organising committee"`
	WebsiteURL  *string     `json:"website_url,omitempty" example:"https://example.com"`
	Kind        EventKind   `json:"kind" enums:"HACKATHON,MEETUP"`
	Format      EventFormat `json:"format" enums:"ONLINE,OFFLINE,HYBRID"`
	Origin      EventOrigin `json:"origin" enums:"RU,WORLD"`
	CountryCode *string     `json:"country_code,omitempty" example:"RU"`
	City        *string     `json:"city,omitempty" example:"Moscow"`
	StartAt     time.Time   `json:"start_at"`
	EndAt       time.Time   `json:"end_at"`
	State       EventState  `json:"state" enums:"UPCOMING,ACTIVE,FINISHED"`
	Joined      bool        `json:"joined" example:"false"`
}

type CatalogPage struct {
	Items []CatalogEvent `json:"items"`
	Meta  PageMeta       `json:"meta"`
}

type CatalogFilter struct {
	Search  string
	Origins []EventOrigin
	Formats []EventFormat
	Kinds   []EventKind
	States  []EventState
	From    *time.Time
	To      *time.Time
}

type ParticipantSelfResponse struct {
	ID                  uuid.UUID           `json:"id"`
	EventID             uuid.UUID           `json:"event_id"`
	TeamRole            *string             `json:"team_role,omitempty" example:"Backend developer"`
	ParticipationStatus ParticipationStatus `json:"participation_status" enums:"ASSIGNED,REMOVED"`
	AssignedAt          time.Time           `json:"assigned_at"`
}

type EventPlacePatch struct {
	CountrySet  bool
	CountryCode *string
	CitySet     bool
	City        *string
}

type JoinEventRequest struct {
	TeamRole *string `json:"team_role,omitempty" example:"Backend developer"`
}
