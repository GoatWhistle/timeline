package models

import (
	"time"

	"github.com/google/uuid"
)

type CatalogEvent struct {
	ID              string         `json:"id" example:"ev_gma9hq8a96q5"`
	Title           string         `json:"title" example:"National event"`
	Description     *string        `json:"description,omitempty"`
	Organizer       *string        `json:"organizer,omitempty" example:"Organising committee"`
	WebsiteURL      *string        `json:"website_url,omitempty" example:"https://example.com"`
	Kind            EventKind      `json:"kind" enums:"HACKATHON,MEETUP"`
	Format          EventFormat    `json:"format" enums:"ONLINE,OFFLINE,HYBRID"`
	Origin          EventOrigin    `json:"origin" enums:"RU,WORLD"`
	CountryCode     *string        `json:"country_code,omitempty" example:"RU"`
	City            *string        `json:"city,omitempty" example:"Moscow"`
	EffectiveFormat EventFormat    `json:"effective_format" enums:"ONLINE,OFFLINE,HYBRID"`
	Track           *string        `json:"track,omitempty" example:"Smart city"`
	PrizePool       *string        `json:"prize_pool,omitempty" example:"500000.00"`
	PrizeCurrency   *string        `json:"prize_currency,omitempty" example:"RUB"`
	TeamSizeMax     *int           `json:"team_size_max,omitempty" example:"5"`
	OfflineStages   []CatalogPlace `json:"offline_stages"`
	StartAt         time.Time      `json:"start_at"`
	EndAt           time.Time      `json:"end_at"`
	State           EventState     `json:"state" enums:"UPCOMING,ACTIVE,FINISHED"`
	Joined          bool           `json:"joined" example:"false"`
}

type CatalogPlace struct {
	ID      string    `json:"id" example:"st_42ej2s5gh7e8"`
	Name    string    `json:"name" example:"Final"`
	Type    StageType `json:"type"`
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
	Place   Place     `json:"place"`
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
	EventID             string              `json:"event_id" example:"ev_gma9hq8a96q5"`
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

type StagePlacePatch struct {
	FormatSet    bool
	Format       *EventFormat
	CountryCode  *string
	City         *string
	VenueSet     bool
	Venue        *string
	OnlineURLSet bool
	OnlineURL    *string
}

type JoinEventRequest struct {
	TeamRole *string `json:"team_role,omitempty" example:"Backend developer"`
}
