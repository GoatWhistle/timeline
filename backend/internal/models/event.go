package models

import (
	"strconv"
	"strings"
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
	Kind          EventKind   `json:"kind"`
	Format        EventFormat `json:"format"`
	Origin        EventOrigin `json:"origin"`
	CountryCode   *string     `json:"country_code,omitempty"`
	City          *string     `json:"city,omitempty"`
	PrizePool     *string     `json:"prize_pool,omitempty"`
	PrizeCurrency *string     `json:"prize_currency,omitempty"`
	TeamSizeMin   *int        `json:"team_size_min,omitempty"`
	TeamSizeMax   *int        `json:"team_size_max,omitempty"`
	StartAt       time.Time   `json:"start_at"`
	EndAt         time.Time   `json:"end_at"`

	CoverManualURL     *string    `json:"cover_manual_url,omitempty"`
	CoverAutoURL       *string    `json:"cover_auto_url,omitempty"`
	CoverAutoSource    *string    `json:"cover_auto_source,omitempty"`
	CoverAutoFetchedAt *time.Time `json:"cover_auto_fetched_at,omitempty"`

	Tracks []EventTrack `json:"tracks,omitempty"`

	ColorSlot       *int       `json:"color_slot,omitempty"`
	ColorAssignedAt *time.Time `json:"color_assigned_at,omitempty"`

	PublishedAt      *time.Time `json:"published_at,omitempty"`
	ArchivedAt       *time.Time `json:"archived_at,omitempty"`
	PurgeScheduledAt *time.Time `json:"purge_scheduled_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
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

func (h *Event) PurgeScheduled() bool { return h.PurgeScheduledAt != nil }

type RetentionSettings struct {
	ArchiveAfterDays         *int
	DeleteArchiveAfterMonths *int
	DeleteCoversOnArchive    bool
	AuditLogRetentionDays    int
	UpdatedBy                *uuid.UUID
	UpdatedAt                time.Time
}

func (r RetentionSettings) AutoArchiveEnabled() bool { return r.ArchiveAfterDays != nil }

func (r RetentionSettings) AutoPurgeEnabled() bool { return r.DeleteArchiveAfterMonths != nil }

type EventTrack struct {
	ID          uuid.UUID    `json:"id"`
	DisplayID   string       `json:"display_id"`
	EventID     uuid.UUID    `json:"event_id"`
	TrackNo     int          `json:"track_no"`
	Name        string       `json:"name"`
	Description *string      `json:"description,omitempty"`
	Prizes      []TrackPrize `json:"prizes"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

func (t *EventTrack) PrizeTotal() string {
	var total int64
	for _, p := range t.Prizes {
		amount, err := strconv.ParseInt(strings.TrimSpace(p.Amount), 10, 64)
		if err != nil {
			continue
		}
		total += amount
	}
	return strconv.FormatInt(total, 10)
}

type TrackPrize struct {
	ID        uuid.UUID `json:"id"`
	DisplayID string    `json:"display_id"`
	TrackID   uuid.UUID `json:"track_id"`
	EventID   uuid.UUID `json:"event_id"`
	Place     *int      `json:"place,omitempty"`
	Title     *string   `json:"title,omitempty"`
	Amount    string    `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (p *TrackPrize) Nomination() bool { return p.Place == nil }

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

const EventColorSlots = 24

type EventColor struct {
	Family string `json:"family" enums:"RU,WORLD"`
	Slot   int    `json:"slot" example:"3"`
}

func (h *Event) Color() *EventColor {
	if h.ColorSlot == nil {
		return nil
	}
	slot := *h.ColorSlot
	if slot < 0 || slot >= EventColorSlots {
		return nil
	}
	return &EventColor{Family: string(h.Origin), Slot: slot}
}

type EventColorClaim struct {
	Slot       int
	AssignedAt time.Time
}

func ValidEventColorSlot(slot int) bool {
	return slot >= 0 && slot < EventColorSlots
}

const CoverURLPrefix = "/api/v1/covers/"

type CoverSource string

const (
	CoverSourceManual CoverSource = "MANUAL"
	CoverSourceAuto   CoverSource = "AUTO"
)

func CoverURL(key string) string {
	return CoverURLPrefix + key
}

func CoverKeyFromURL(url *string) string {
	if url == nil {
		return ""
	}
	value := strings.TrimSpace(*url)
	if !strings.HasPrefix(value, CoverURLPrefix) {
		return ""
	}
	return strings.TrimPrefix(value, CoverURLPrefix)
}

type EventCoverKeys struct {
	Manual string
	Auto   string
}

func (h *Event) CoverKeys() EventCoverKeys {
	return EventCoverKeys{
		Manual: CoverKeyFromURL(h.CoverManualURL),
		Auto:   CoverKeyFromURL(h.CoverAutoURL),
	}
}

func (h *Event) EffectiveCoverURL() *string {
	if h.CoverManualURL != nil {
		return h.CoverManualURL
	}
	return h.CoverAutoURL
}

func (h *Event) EffectiveCoverSource() *CoverSource {
	switch {
	case h.CoverManualURL != nil:
		source := CoverSourceManual
		return &source
	case h.CoverAutoURL != nil:
		source := CoverSourceAuto
		return &source
	}
	return nil
}
