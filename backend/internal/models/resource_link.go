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
	ID             uuid.UUID  `json:"-"`
	DisplayID      string     `json:"id" example:"rl_42ej2s5gh7e8"`
	EventID        uuid.UUID  `json:"-"`
	EventDisplayID string     `json:"event_id" example:"ev_gma9hq8a96q5"`
	StageID        *uuid.UUID `json:"-"`
	StageDisplayID *string    `json:"stage_id,omitempty" example:"st_42ej2s5gh7e8"`
	Kind           LinkKind   `json:"kind" example:"RULES"`
	URL            string     `json:"url" example:"https://example.org/rules"`
	Title          *string    `json:"title,omitempty" example:"Rules and code of conduct"`
	IsPinned       bool       `json:"is_pinned" example:"false"`
	SortOrder      int        `json:"sort_order" example:"0"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

const ProfileLinkMaxPerUser = 8

type ProfileLink struct {
	ID        uuid.UUID `json:"-"`
	DisplayID string    `json:"id" example:"pf_42ej2s5gh7e8"`
	URL       string    `json:"url" example:"https://github.com/ivan"`
	Kind      string    `json:"kind" example:"github"`
	Label     *string   `json:"label,omitempty" example:"My repositories"`
	SortOrder int       `json:"sort_order" example:"0"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

const TeamEventLinkMaxPerEntry = 20

type TeamEventLink struct {
	ID             uuid.UUID `json:"-"`
	DisplayID      string    `json:"id" example:"tl_42ej2s5gh7e8"`
	EntryID        uuid.UUID `json:"-"`
	EntryDisplayID string    `json:"entry_id" example:"te_42ej2s5gh7e8"`
	CreatedBy      uuid.UUID `json:"-"`
	URL            string    `json:"url" example:"https://github.com/team/project"`
	Label          *string   `json:"label,omitempty" example:"Our repository"`
	SortOrder      int       `json:"sort_order" example:"0"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
