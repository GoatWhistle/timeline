package models

import (
	"time"

	"github.com/google/uuid"
)

type DigestItemKind string

const (
	DigestDeadline DigestItemKind = "REGISTRATION_DEADLINE"
	DigestStage    DigestItemKind = "STAGE_START"
	DigestTask     DigestItemKind = "PERSONAL_TASK"
)

type DigestRecipient struct {
	UserID            uuid.UUID
	Locale            string
	Timezone          string
	RecipientChannels RecipientChannels
}

type DigestItem struct {
	Kind           DigestItemKind
	EventID        uuid.UUID
	EventDisplayID string
	EventTitle     string
	Title          string
	At             time.Time
}

type WeeklyDigest struct {
	Recipient DigestRecipient
	WeekStart time.Time
	WeekEnd   time.Time
	Items     []DigestItem
}

func (d *WeeklyDigest) Empty() bool { return len(d.Items) == 0 }

func (d *WeeklyDigest) Count(kind DigestItemKind) int {
	total := 0
	for _, item := range d.Items {
		if item.Kind == kind {
			total++
		}
	}
	return total
}
