package models

import (
	"time"

	"github.com/google/uuid"
)

type InboxActionKind string

const (
	InboxActionOpen           InboxActionKind = "OPEN"
	InboxActionMarkRegistered InboxActionKind = "MARK_REGISTERED"
)

func (k InboxActionKind) Valid() bool {
	return k == InboxActionOpen || k == InboxActionMarkRegistered
}

type InboxAction struct {
	Kind InboxActionKind `json:"kind"`
	Href *string         `json:"href,omitempty"`
}

type InboxItem struct {
	ID              uuid.UUID
	DisplayID       string
	RecipientUserID uuid.UUID
	Kind            string
	Title           string
	BodyMD          string
	SubjectType     *string
	SubjectID       *uuid.UUID
	Actions         []InboxAction
	LogicalKey      string
	ReadAt          *time.Time
	DeletedAt       *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (i *InboxItem) Unread() bool {
	return i.ReadAt == nil
}

func (i *InboxItem) SoftDeleted() bool {
	return i.DeletedAt != nil
}
