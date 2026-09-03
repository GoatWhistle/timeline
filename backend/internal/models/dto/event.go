package dto

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type EventResponse struct {
	ID          string             `json:"id" example:"ev_gma9hq8a96q5"`
	Title       string             `json:"title" example:"National event"`
	Description *string            `json:"description,omitempty"`
	Organizer   *string            `json:"organizer,omitempty" example:"Organising committee"`
	WebsiteURL  *string            `json:"website_url,omitempty" example:"https://example.com"`
	Kind        models.EventKind   `json:"kind" enums:"HACKATHON,MEETUP"`
	Format      models.EventFormat `json:"format" enums:"ONLINE,OFFLINE,HYBRID"`
	Origin      models.EventOrigin `json:"origin" enums:"RU,WORLD"`
	CountryCode *string            `json:"country_code,omitempty" example:"RU"`
	City        *string            `json:"city,omitempty" example:"Moscow"`

	EffectiveFormat models.EventFormat `json:"effective_format" enums:"ONLINE,OFFLINE,HYBRID"`
	Track           *string            `json:"track,omitempty" example:"Smart city"`
	PrizePool       *string            `json:"prize_pool,omitempty" example:"500000.00"`
	PrizeCurrency   *string            `json:"prize_currency,omitempty" example:"RUB"`
	TeamSizeMin     *int               `json:"team_size_min,omitempty" example:"3"`
	TeamSizeMax     *int               `json:"team_size_max,omitempty" example:"5"`

	CoverURL    *string             `json:"cover_url,omitempty" example:"/api/v1/covers/abc.png"`
	CoverSource *models.CoverSource `json:"cover_source,omitempty" enums:"MANUAL,AUTO"`

	Color *models.EventColor `json:"color,omitempty"`

	StartAt     time.Time         `json:"start_at"`
	EndAt       time.Time         `json:"end_at"`
	State       models.EventState `json:"state" enums:"UNPUBLISHED,UPCOMING,ACTIVE,FINISHED,ARCHIVED"`
	PublishedAt *time.Time        `json:"published_at,omitempty"`
	ArchivedAt  *time.Time        `json:"archived_at,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

type EventPage struct {
	Items []EventResponse `json:"items"`
	Meta  PageMeta        `json:"meta"`
}

type CreateEventRequest struct {
	Title       string              `json:"title" example:"National event"`
	Description *string             `json:"description,omitempty"`
	Organizer   *string             `json:"organizer,omitempty"`
	WebsiteURL  *string             `json:"website_url,omitempty" example:"https://example.com"`
	Kind        *models.EventKind   `json:"kind,omitempty" enums:"HACKATHON,MEETUP"`
	Format      *models.EventFormat `json:"format,omitempty" enums:"ONLINE,OFFLINE,HYBRID"`
	Origin      *models.EventOrigin `json:"origin,omitempty" enums:"RU,WORLD"`
	CountryCode *string             `json:"country_code,omitempty" example:"RU"`
	City        *string             `json:"city,omitempty" example:"Moscow"`

	Track         *string `json:"track,omitempty" example:"Smart city"`
	PrizePool     *string `json:"prize_pool,omitempty" example:"500000.00"`
	PrizeCurrency *string `json:"prize_currency,omitempty" example:"RUB"`
	TeamSizeMin   *int    `json:"team_size_min,omitempty" example:"3"`
	TeamSizeMax   *int    `json:"team_size_max,omitempty" example:"5"`

	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
}

type UpdateEventRequest struct {
	Title       *string             `json:"title,omitempty"`
	Description *string             `json:"description,omitempty"`
	Organizer   *string             `json:"organizer,omitempty"`
	WebsiteURL  *string             `json:"website_url,omitempty"`
	Kind        *models.EventKind   `json:"kind,omitempty" enums:"HACKATHON,MEETUP"`
	Format      *models.EventFormat `json:"format,omitempty" enums:"ONLINE,OFFLINE,HYBRID"`
	Origin      *models.EventOrigin `json:"origin,omitempty" enums:"RU,WORLD"`
	CountryCode *string             `json:"country_code,omitempty" example:"RU"`
	City        *string             `json:"city,omitempty" example:"Moscow"`

	Track         *string `json:"track,omitempty" example:"Smart city"`
	PrizePool     *string `json:"prize_pool,omitempty" example:"500000.00"`
	PrizeCurrency *string `json:"prize_currency,omitempty" example:"RUB"`
	TeamSizeMin   *int    `json:"team_size_min,omitempty" example:"3"`
	TeamSizeMax   *int    `json:"team_size_max,omitempty" example:"5"`

	StartAt *time.Time `json:"start_at,omitempty"`
	EndAt   *time.Time `json:"end_at,omitempty"`
}

type StageResponse struct {
	ID          string              `json:"id" example:"st_42ej2s5gh7e8"`
	EventID     string              `json:"event_id" example:"ev_gma9hq8a96q5"`
	Name        string              `json:"name" example:"Call for applications"`
	Type        models.StageType    `json:"type" enums:"REGISTRATION,SELECTION,PARTICIPATION,CHECKPOINT,SUBMISSION,DEMO,RESULTS,OTHER"`
	StartAt     time.Time           `json:"start_at"`
	EndAt       time.Time           `json:"end_at"`
	Description *string             `json:"description,omitempty"`
	URL         *string             `json:"url,omitempty" example:"https://example.com/stage"`
	Format      *models.EventFormat `json:"format,omitempty" enums:"ONLINE,OFFLINE,HYBRID"`
	CountryCode *string             `json:"country_code,omitempty" example:"RU"`
	City        *string             `json:"city,omitempty" example:"Kazan"`
	Venue       *string             `json:"venue,omitempty" example:"IT Park"`
	OnlineURL   *string             `json:"online_url,omitempty" example:"https://example.com/stream"`
	Place       models.Place        `json:"place"`
	SortOrder   int                 `json:"sort_order" example:"0"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

type CreateStageRequest struct {
	Name        string              `json:"name" example:"Call for applications"`
	Type        models.StageType    `json:"type" enums:"REGISTRATION,SELECTION,PARTICIPATION,CHECKPOINT,SUBMISSION,DEMO,RESULTS,OTHER"`
	StartAt     time.Time           `json:"start_at"`
	EndAt       time.Time           `json:"end_at"`
	Description *string             `json:"description,omitempty"`
	URL         *string             `json:"url,omitempty"`
	Format      *models.EventFormat `json:"format,omitempty" enums:"ONLINE,OFFLINE,HYBRID"`
	CountryCode *string             `json:"country_code,omitempty" example:"RU"`
	City        *string             `json:"city,omitempty" example:"Kazan"`
	Venue       *string             `json:"venue,omitempty" example:"IT Park"`
	OnlineURL   *string             `json:"online_url,omitempty" example:"https://example.com/stream"`
	SortOrder   *int                `json:"sort_order,omitempty"`
}

type UpdateStageRequest struct {
	Name        *string             `json:"name,omitempty"`
	Type        *models.StageType   `json:"type,omitempty" enums:"REGISTRATION,SELECTION,PARTICIPATION,CHECKPOINT,SUBMISSION,DEMO,RESULTS,OTHER"`
	StartAt     *time.Time          `json:"start_at,omitempty"`
	EndAt       *time.Time          `json:"end_at,omitempty"`
	Description *string             `json:"description,omitempty"`
	URL         *string             `json:"url,omitempty"`
	Format      *models.EventFormat `json:"format,omitempty" enums:"ONLINE,OFFLINE,HYBRID"`
	CountryCode *string             `json:"country_code,omitempty" example:"RU"`
	City        *string             `json:"city,omitempty" example:"Kazan"`
	Venue       *string             `json:"venue,omitempty" example:"IT Park"`
	OnlineURL   *string             `json:"online_url,omitempty" example:"https://example.com/stream"`
	ClearFormat bool                `json:"clear_format,omitempty" example:"false"`
	SortOrder   *int                `json:"sort_order,omitempty"`
}
