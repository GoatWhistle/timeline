package models

import (
	"time"

	"github.com/google/uuid"
)

type Actor struct {
	UserID    uuid.UUID
	SessionID uuid.UUID
	IsAdmin   bool
	RequestID string
}

func SystemActor(requestID string) Actor {
	return Actor{RequestID: requestID}
}

func (a Actor) IsSystem() bool { return a.UserID == uuid.Nil }

func (a Actor) UserRef() *uuid.UUID {
	if a.IsSystem() {
		return nil
	}
	id := a.UserID
	return &id
}

func (a Actor) Source() ChangeSource {
	switch {
	case a.IsSystem():
		return SourceSystem
	case a.IsAdmin:
		return SourceAdmin
	default:
		return SourceUser
	}
}

type SessionMeta struct {
	UserAgent string
	IP        string
}

type TokenPair struct {
	AccessToken      string
	AccessExpiresAt  time.Time
	RefreshToken     string
	RefreshExpiresAt time.Time
}

type Page struct {
	Number int
	Size   int
}

func (p Page) Offset() int {
	if p.Number < 1 {
		return 0
	}
	return (p.Number - 1) * p.Size
}

func (p Page) Limit() int { return p.Size }

type EventFilter struct {
	Search          string
	States          []EventState
	Origins         []EventOrigin
	Formats         []EventFormat
	Kinds           []EventKind
	IncludeArchived bool
}

type ParticipantFilter struct {
	TeamRole           string
	RegistrationStatus RegistrationStatusValue
	IncludeRemoved     bool
	Search             string
}

type ScheduleFilter struct {
	From            time.Time
	To              time.Time
	States          []EventState
	ParticipantUser *uuid.UUID
	IncludeArchived bool
}

type AuditFilter struct {
	ActorUserID *uuid.UUID
	Action      string
	EntityType  string
	EntityID    *uuid.UUID
	From        *time.Time
	To          *time.Time
}

type MyEventFilter struct {
	IncludeArchived bool
	States          []EventState
}
