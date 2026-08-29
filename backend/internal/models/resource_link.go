package models

import (
	"time"

	"github.com/google/uuid"
)

type LinkKind string

const (
	LinkWebsite      LinkKind = "WEBSITE"
	LinkRules        LinkKind = "RULES"
	LinkRegistration LinkKind = "REGISTRATION"
	LinkSubmission   LinkKind = "SUBMISSION"
	LinkChat         LinkKind = "CHAT"
	LinkDataset      LinkKind = "DATASET"
	LinkAPIDocs      LinkKind = "API_DOCS"
	LinkJudging      LinkKind = "JUDGING"
	LinkMentors      LinkKind = "MENTORS"
	LinkResults      LinkKind = "RESULTS"
	LinkSponsor      LinkKind = "SPONSOR"
	LinkOther        LinkKind = "OTHER"
)

func (k LinkKind) Valid() bool {
	switch k {
	case LinkWebsite, LinkRules, LinkRegistration, LinkSubmission,
		LinkChat, LinkDataset, LinkAPIDocs, LinkJudging,
		LinkMentors, LinkResults, LinkSponsor, LinkOther:
		return true
	}
	return false
}

type ResourceLink struct {
	ID        uuid.UUID  `json:"id"`
	EventID   uuid.UUID  `json:"event_id"`
	StageID   *uuid.UUID `json:"stage_id,omitempty"`
	Kind      LinkKind   `json:"kind" example:"RULES"`
	URL       string     `json:"url" example:"https://example.org/rules"`
	Title     *string    `json:"title,omitempty" example:"Rules and code of conduct"`
	IsPinned  bool       `json:"is_pinned" example:"false"`
	SortOrder int        `json:"sort_order" example:"0"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type ParticipantLink struct {
	ID        uuid.UUID `json:"id"`
	EventID   uuid.UUID `json:"event_id"`
	Kind      LinkKind  `json:"kind" example:"OTHER"`
	URL       string    `json:"url" example:"https://example.org/my-notes"`
	Title     *string   `json:"title,omitempty" example:"My scratch notes"`
	SortOrder int       `json:"sort_order" example:"0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

const ProfileLinkMaxPerUser = 10

type ProfileLink struct {
	ID        uuid.UUID `json:"id"`
	URL       string    `json:"url" example:"https://github.com/ivan"`
	Label     *string   `json:"label,omitempty" example:"My repositories"`
	SortOrder int       `json:"sort_order" example:"0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
