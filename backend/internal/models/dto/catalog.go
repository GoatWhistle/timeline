package dto

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type CatalogEvent struct {
	ID              string             `json:"id" example:"ev_gma9hq8a96q5"`
	Title           string             `json:"title" example:"National event"`
	Description     *string            `json:"description,omitempty"`
	Organizer       *string            `json:"organizer,omitempty" example:"Organising committee"`
	WebsiteURL      *string            `json:"website_url,omitempty" example:"https://example.com"`
	Kind            models.EventKind   `json:"kind" enums:"HACKATHON,MEETUP"`
	Format          models.EventFormat `json:"format" enums:"ONLINE,OFFLINE,HYBRID"`
	Origin          models.EventOrigin `json:"origin" enums:"RU,WORLD"`
	CountryCode     *string            `json:"country_code,omitempty" example:"RU"`
	City            *string            `json:"city,omitempty" example:"Moscow"`
	EffectiveFormat models.EventFormat `json:"effective_format" enums:"ONLINE,OFFLINE,HYBRID"`
	Track           *string            `json:"track,omitempty" example:"Smart city"`
	PrizePool       *string            `json:"prize_pool,omitempty" example:"500000.00"`
	PrizeCurrency   *string            `json:"prize_currency,omitempty" example:"RUB"`
	TeamSizeMax     *int               `json:"team_size_max,omitempty" example:"5"`
	OfflineStages   []CatalogPlace     `json:"offline_stages"`
	StartAt         time.Time          `json:"start_at"`
	EndAt           time.Time          `json:"end_at"`
	State           models.EventState  `json:"state" enums:"UPCOMING,ACTIVE,FINISHED"`
	Joined          bool               `json:"joined" example:"false"`
}

type CatalogPlace struct {
	ID      string           `json:"id" example:"st_42ej2s5gh7e8"`
	Name    string           `json:"name" example:"Final"`
	Type    models.StageType `json:"type"`
	StartAt time.Time        `json:"start_at"`
	EndAt   time.Time        `json:"end_at"`
	Place   models.Place     `json:"place"`
}

type CatalogPage struct {
	Items []CatalogEvent `json:"items"`
	Meta  PageMeta       `json:"meta"`
}

type CatalogFilter struct {
	Search  string
	Origins []models.EventOrigin
	Formats []models.EventFormat
	Kinds   []models.EventKind
	States  []models.EventState
	From    *time.Time
	To      *time.Time
}

type ParticipantSelfResponse struct {
	ID                  string                     `json:"id" example:"pa_42ej2s5gh7e8"`
	EventID             string                     `json:"event_id" example:"ev_gma9hq8a96q5"`
	TeamRole            *string                    `json:"team_role,omitempty" example:"Backend developer"`
	ParticipationStatus models.ParticipationStatus `json:"participation_status" enums:"ASSIGNED,REMOVED"`
	AssignedAt          time.Time                  `json:"assigned_at"`
}

type EventPlacePatch struct {
	CountrySet  bool
	CountryCode *string
	CitySet     bool
	City        *string
}

type StagePlacePatch struct {
	FormatSet    bool
	Format       *models.EventFormat
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
