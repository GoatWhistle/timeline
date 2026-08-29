package models

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type ArtifactKind string

const (
	ArtifactRepository ArtifactKind = "REPOSITORY"
	ArtifactVideo      ArtifactKind = "VIDEO"
	ArtifactSlides     ArtifactKind = "SLIDES"
	ArtifactDemo       ArtifactKind = "DEMO"
	ArtifactSubmission ArtifactKind = "SUBMISSION"
	ArtifactOther      ArtifactKind = "OTHER"
)

func (k ArtifactKind) Valid() bool {
	switch k {
	case ArtifactRepository, ArtifactVideo, ArtifactSlides,
		ArtifactDemo, ArtifactSubmission, ArtifactOther:
		return true
	}
	return false
}

type Outcome string

const (
	OutcomeParticipated Outcome = "PARTICIPATED"
	OutcomeShortlisted  Outcome = "SHORTLISTED"
	OutcomeWinner       Outcome = "WINNER"
	OutcomePrize        Outcome = "PRIZE"
)

func (o Outcome) Valid() bool {
	switch o {
	case OutcomeParticipated, OutcomeShortlisted, OutcomeWinner, OutcomePrize:
		return true
	}
	return false
}

func (o Outcome) AllowsPlace() bool {
	return o == OutcomeShortlisted || o == OutcomeWinner || o == OutcomePrize
}

type ParticipantTask struct {
	ID        uuid.UUID  `json:"id"`
	EventID   uuid.UUID  `json:"event_id"`
	StageID   *uuid.UUID `json:"stage_id,omitempty"`
	Title     string     `json:"title" example:"Record the demo video"`
	Notes     *string    `json:"notes,omitempty"`
	DueAt     *time.Time `json:"due_at,omitempty"`
	DoneAt    *time.Time `json:"done_at,omitempty"`
	SortOrder int        `json:"sort_order" example:"0"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type ParticipantNote struct {
	EventID   uuid.UUID  `json:"event_id"`
	Body      string     `json:"body" example:"Draft notes in Markdown"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
}

type ParticipantArtifact struct {
	ID          uuid.UUID    `json:"id"`
	EventID     uuid.UUID    `json:"event_id"`
	Kind        ArtifactKind `json:"kind" enums:"REPOSITORY,VIDEO,SLIDES,DEMO,SUBMISSION,OTHER"`
	URL         string       `json:"url" example:"https://github.com/example/project"`
	Title       *string      `json:"title,omitempty" example:"Project repository"`
	SubmittedAt *time.Time   `json:"submitted_at,omitempty"`
	SortOrder   int          `json:"sort_order" example:"0"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

type ParticipantOutcome struct {
	EventID   uuid.UUID `json:"event_id"`
	Outcome   Outcome   `json:"outcome" enums:"PARTICIPATED,SHORTLISTED,WINNER,PRIZE"`
	Place     *int      `json:"place,omitempty" example:"2"`
	Prize     *string   `json:"prize,omitempty" example:"Jury award"`
	Track     *string   `json:"track,omitempty" example:"Smart city"`
	Note      *string   `json:"note,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type EventBookmark struct {
	EventID   uuid.UUID `json:"event_id"`
	CreatedAt time.Time `json:"created_at"`
}

type ChecklistTemplate struct {
	ID    string                  `json:"id" example:"preparation"`
	Items []ChecklistTemplateItem `json:"items"`
}

type ChecklistTemplateItem struct {
	SlotNo           int    `json:"slot_no" example:"1"`
	TitleKey         string `json:"title_key" example:"task.read_rules"`
	DueOffsetMinutes *int   `json:"due_offset_minutes,omitempty" example:"-10080"`
}

type ParticipantRetrospective struct {
	EventID   uuid.UUID  `json:"event_id"`
	WentWell  *string    `json:"went_well,omitempty"`
	WentBadly *string    `json:"went_badly,omitempty"`
	NextTime  *string    `json:"next_time,omitempty"`
	CreatedAt *time.Time `json:"created_at,omitempty"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
}

func (r ParticipantRetrospective) Empty() bool {
	return blankText(r.WentWell) && blankText(r.WentBadly) && blankText(r.NextTime)
}

func blankText(value *string) bool {
	return value == nil || strings.TrimSpace(*value) == ""
}

type DueTaskCandidate struct {
	TaskID     uuid.UUID
	UserID     uuid.UUID
	EventID    uuid.UUID
	Title      string
	DueAt      time.Time
	EventTitle string
}

type DueRetrospectiveCandidate struct {
	EventID    uuid.UUID
	UserID     uuid.UUID
	EventTitle string
	EndAt      time.Time
}
