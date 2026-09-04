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

	EffectiveFormat models.EventFormat  `json:"effective_format" enums:"ONLINE,OFFLINE,HYBRID"`
	Tracks          []EventTrackSummary `json:"tracks"`
	PrizePool       *string             `json:"prize_pool,omitempty" example:"500000.00"`
	PrizeCurrency   *string             `json:"prize_currency,omitempty" example:"RUB"`
	TeamSizeMin     *int                `json:"team_size_min,omitempty" example:"3"`
	TeamSizeMax     *int                `json:"team_size_max,omitempty" example:"5"`

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

type EventTrackSummary struct {
	ID         string `json:"id" example:"tr_42ej2s5gh7e8"`
	TrackNo    int    `json:"track_no" example:"1"`
	Name       string `json:"name" example:"Smart city"`
	PrizeTotal string `json:"prize_total" example:"300000"`
}

type TrackPrizeResponse struct {
	ID     string `json:"id" example:"pz_42ej2s5gh7e8"`
	Place  int    `json:"place" example:"1"`
	Amount string `json:"amount" example:"150000"`
}

type EventTrackResponse struct {
	ID          string               `json:"id" example:"tr_42ej2s5gh7e8"`
	EventID     string               `json:"event_id" example:"ev_gma9hq8a96q5"`
	TrackNo     int                  `json:"track_no" example:"1"`
	Name        string               `json:"name" example:"Smart city"`
	Description *string              `json:"description,omitempty"`
	Prizes      []TrackPrizeResponse `json:"prizes"`
	PrizeTotal  string               `json:"prize_total" example:"300000"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
}

type EventTrackListResponse struct {
	Items         []EventTrackResponse `json:"items"`
	PrizePool     *string              `json:"prize_pool,omitempty" example:"500000"`
	PrizeCurrency *string              `json:"prize_currency,omitempty" example:"RUB"`
	Distributed   string               `json:"distributed" example:"450000"`
	Unallocated   *string              `json:"unallocated,omitempty" example:"50000"`
}

type TrackPrizeInput struct {
	Place  int    `json:"place" example:"1"`
	Amount string `json:"amount" example:"150000"`
}

type CreateEventTrackRequest struct {
	Name        string            `json:"name" example:"Smart city"`
	Description *string           `json:"description,omitempty"`
	TrackNo     *int              `json:"track_no,omitempty" example:"1"`
	Prizes      []TrackPrizeInput `json:"prizes,omitempty"`
}

type UpdateEventTrackRequest struct {
	Name        *string           `json:"name,omitempty"`
	Description *string           `json:"description,omitempty"`
	TrackNo     *int              `json:"track_no,omitempty"`
	Prizes      []TrackPrizeInput `json:"prizes,omitempty"`
	SetPrizes   bool              `json:"set_prizes,omitempty" example:"false"`
}

type ChooseTrackRequest struct {
	TrackID *string `json:"track_id,omitempty" example:"tr_42ej2s5gh7e8"`
}

func TrackSummaries(tracks []models.EventTrack) []EventTrackSummary {
	out := make([]EventTrackSummary, 0, len(tracks))
	for i := range tracks {
		out = append(out, EventTrackSummary{
			ID:         tracks[i].DisplayID,
			TrackNo:    tracks[i].TrackNo,
			Name:       tracks[i].Name,
			PrizeTotal: tracks[i].PrizeTotal(),
		})
	}
	return out
}
