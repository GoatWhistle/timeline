package models

import (
	"time"

	"github.com/google/uuid"
)

type EventResponse struct {
	ID          uuid.UUID  `json:"id"`
	Title       string     `json:"title" example:"National event"`
	Description *string    `json:"description,omitempty"`
	Organizer   *string    `json:"organizer,omitempty" example:"Organising committee"`
	WebsiteURL  *string    `json:"website_url,omitempty" example:"https://example.com"`
	Notes       *string    `json:"notes,omitempty"`
	Kind        EventKind   `json:"kind" enums:"HACKATHON,MEETUP"`
	Format      EventFormat `json:"format" enums:"ONLINE,OFFLINE,HYBRID"`
	Origin      EventOrigin `json:"origin" enums:"RU,WORLD"`
	CountryCode *string    `json:"country_code,omitempty" example:"RU"`
	City        *string    `json:"city,omitempty" example:"Moscow"`
	StartAt     time.Time  `json:"start_at"`
	EndAt       time.Time  `json:"end_at"`
	State       EventState `json:"state" enums:"UNPUBLISHED,UPCOMING,ACTIVE,FINISHED,ARCHIVED"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	ArchivedAt  *time.Time `json:"archived_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type EventPage struct {
	Items []EventResponse `json:"items"`
	Meta  PageMeta        `json:"meta"`
}

type CreateEventRequest struct {
	Title       string    `json:"title" example:"National event"`
	Description *string   `json:"description,omitempty"`
	Organizer   *string   `json:"organizer,omitempty"`
	WebsiteURL  *string   `json:"website_url,omitempty" example:"https://example.com"`
	Notes       *string   `json:"notes,omitempty"`
	Kind        *EventKind   `json:"kind,omitempty" enums:"HACKATHON,MEETUP"`
	Format      *EventFormat `json:"format,omitempty" enums:"ONLINE,OFFLINE,HYBRID"`
	Origin      *EventOrigin `json:"origin,omitempty" enums:"RU,WORLD"`
	CountryCode *string   `json:"country_code,omitempty" example:"RU"`
	City        *string   `json:"city,omitempty" example:"Moscow"`
	StartAt     time.Time `json:"start_at"`
	EndAt       time.Time `json:"end_at"`
}

type UpdateEventRequest struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	Organizer   *string    `json:"organizer,omitempty"`
	WebsiteURL  *string    `json:"website_url,omitempty"`
	Notes       *string    `json:"notes,omitempty"`
	Kind        *EventKind   `json:"kind,omitempty" enums:"HACKATHON,MEETUP"`
	Format      *EventFormat `json:"format,omitempty" enums:"ONLINE,OFFLINE,HYBRID"`
	Origin      *EventOrigin `json:"origin,omitempty" enums:"RU,WORLD"`
	CountryCode *string    `json:"country_code,omitempty" example:"RU"`
	City        *string    `json:"city,omitempty" example:"Moscow"`
	StartAt     *time.Time `json:"start_at,omitempty"`
	EndAt       *time.Time `json:"end_at,omitempty"`
}

type StageResponse struct {
	ID          uuid.UUID `json:"id"`
	EventID     uuid.UUID `json:"event_id"`
	Name        string    `json:"name" example:"Call for applications"`
	Type        StageType `json:"type" enums:"REGISTRATION,SELECTION,PARTICIPATION,CHECKPOINT,SUBMISSION,DEMO,RESULTS,OTHER"`
	StartAt     time.Time `json:"start_at"`
	EndAt       time.Time `json:"end_at"`
	Description *string   `json:"description,omitempty"`
	URL         *string   `json:"url,omitempty" example:"https://example.com/stage"`
	SortOrder   int       `json:"sort_order" example:"0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateStageRequest struct {
	Name        string    `json:"name" example:"Call for applications"`
	Type        StageType `json:"type" enums:"REGISTRATION,SELECTION,PARTICIPATION,CHECKPOINT,SUBMISSION,DEMO,RESULTS,OTHER"`
	StartAt     time.Time `json:"start_at"`
	EndAt       time.Time `json:"end_at"`
	Description *string   `json:"description,omitempty"`
	URL         *string   `json:"url,omitempty"`
	SortOrder   *int      `json:"sort_order,omitempty"`
}

type UpdateStageRequest struct {
	Name        *string    `json:"name,omitempty"`
	Type        *StageType `json:"type,omitempty" enums:"REGISTRATION,SELECTION,PARTICIPATION,CHECKPOINT,SUBMISSION,DEMO,RESULTS,OTHER"`
	StartAt     *time.Time `json:"start_at,omitempty"`
	EndAt       *time.Time `json:"end_at,omitempty"`
	Description *string    `json:"description,omitempty"`
	URL         *string    `json:"url,omitempty"`
	SortOrder   *int       `json:"sort_order,omitempty"`
}
