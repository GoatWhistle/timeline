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
