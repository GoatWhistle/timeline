package models

import (
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID            uuid.UUID   `json:"id"`
	DisplayID     string      `json:"display_id"`
	Title         string      `json:"title"`
	Description   *string     `json:"description,omitempty"`
	Organizer     *string     `json:"organizer,omitempty"`
	WebsiteURL    *string     `json:"website_url,omitempty"`
	Notes         *string     `json:"notes,omitempty"`
	Kind          EventKind   `json:"kind"`
	Format        EventFormat `json:"format"`
	Origin        EventOrigin `json:"origin"`
	CountryCode   *string     `json:"country_code,omitempty"`
	City          *string     `json:"city,omitempty"`
	Track         *string     `json:"track,omitempty"`
	PrizePool     *string     `json:"prize_pool,omitempty"`
	PrizeCurrency *string     `json:"prize_currency,omitempty"`
	TeamSizeMin   *int        `json:"team_size_min,omitempty"`
	TeamSizeMax   *int        `json:"team_size_max,omitempty"`
	StartAt       time.Time   `json:"start_at"`
	EndAt         time.Time   `json:"end_at"`
	PublishedAt   *time.Time  `json:"published_at,omitempty"`
	ArchivedAt    *time.Time  `json:"archived_at,omitempty"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
}

func (h *Event) State(now time.Time) EventState {
	switch {
	case h.ArchivedAt != nil:
		return EventArchived
	case h.PublishedAt == nil:
		return EventUnpublished
	case now.Before(h.StartAt):
		return EventUpcoming
	case now.After(h.EndAt):
		return EventFinished
	default:
		return EventActive
	}
}

func (h *Event) Published() bool { return h.PublishedAt != nil }

func (h *Event) Archived() bool { return h.ArchivedAt != nil }

func (h *Event) Schedulable() bool { return h.Published() && !h.Archived() }

type Stage struct {
	ID          uuid.UUID    `json:"id"`
	DisplayID   string       `json:"display_id"`
	EventID     uuid.UUID    `json:"event_id"`
	Name        string       `json:"name"`
	Type        StageType    `json:"type"`
	StartAt     time.Time    `json:"start_at"`
	EndAt       time.Time    `json:"end_at"`
	Description *string      `json:"description,omitempty"`
	URL         *string      `json:"url,omitempty"`
	Format      *EventFormat `json:"format,omitempty"`
	CountryCode *string      `json:"country_code,omitempty"`
	City        *string      `json:"city,omitempty"`
	Venue       *string      `json:"venue,omitempty"`
	OnlineURL   *string      `json:"online_url,omitempty"`
	SortOrder   int          `json:"sort_order"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

type EventParticipant struct {
	ID                  uuid.UUID           `json:"id"`
	DisplayID           string              `json:"display_id"`
	EventID             uuid.UUID           `json:"event_id"`
	UserID              uuid.UUID           `json:"user_id"`
	TeamRole            *string             `json:"team_role,omitempty"`
	ParticipationStatus ParticipationStatus `json:"participation_status"`
	AssignmentVersion   int                 `json:"assignment_version"`
	AssignedAt          time.Time           `json:"assigned_at"`
	RemovedAt           *time.Time          `json:"removed_at,omitempty"`
	CreatedAt           time.Time           `json:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at"`
}

func (p *EventParticipant) Assigned() bool {
	return p.ParticipationStatus == ParticipationAssigned
}
