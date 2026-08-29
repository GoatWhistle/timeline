package models

import (
	"time"

	"github.com/google/uuid"
)

type CalendarFeedToken struct {
	ID         uuid.UUID  `json:"-"`
	UserID     uuid.UUID  `json:"-"`
	TokenHash  string     `json:"-"`
	CreatedAt  time.Time  `json:"-"`
	LastUsedAt *time.Time `json:"-"`
	RevokedAt  *time.Time `json:"-"`
}

func (t *CalendarFeedToken) Active() bool { return t.RevokedAt == nil }

type CalendarFeedResponse struct {
	Enabled    bool       `json:"enabled" example:"true"`
	CreatedAt  *time.Time `json:"created_at,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
}

type CalendarFeedSecretResponse struct {
	URL       string    `json:"url" example:"https://timeline.example.com/api/v1/calendar/9Qk3.../feed.ics"`
	CreatedAt time.Time `json:"created_at"`
}

type CalendarEntryKind string

const (
	CalendarEntryEvent        CalendarEntryKind = "EVENT"
	CalendarEntryStage        CalendarEntryKind = "STAGE"
	CalendarEntryRegistration CalendarEntryKind = "REGISTRATION_DEADLINE"
)

type CalendarEntry struct {
	Kind     CalendarEntryKind
	EventID  uuid.UUID
	StageID  uuid.UUID
	Summary  string
	Location string
	StartAt  time.Time
	EndAt    time.Time
}
