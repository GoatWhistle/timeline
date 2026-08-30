package dto

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"

	"github.com/google/uuid"
)

type CreateTaskRequest struct {
	Title     string     `json:"title" example:"Record the demo video"`
	Notes     *string    `json:"notes,omitempty"`
	DueAt     *time.Time `json:"due_at,omitempty"`
	StageID   *string    `json:"stage_id,omitempty" example:"st_42ej2s5gh7e8"`
	SortOrder *int       `json:"sort_order,omitempty" example:"0"`
}

type UpdateTaskRequest struct {
	Title      *string    `json:"title,omitempty" example:"Record the demo video"`
	Notes      *string    `json:"notes,omitempty"`
	DueAt      *time.Time `json:"due_at,omitempty"`
	ClearDueAt bool       `json:"clear_due_at,omitempty" example:"false"`
	StageID    *string    `json:"stage_id,omitempty" example:"st_42ej2s5gh7e8"`
	ClearStage bool       `json:"clear_stage,omitempty" example:"false"`
	SortOrder  *int       `json:"sort_order,omitempty" example:"0"`
	Done       *bool      `json:"done,omitempty" example:"true"`
}

type TaskPatch struct {
	Title     *string
	Notes     *string
	NotesSet  bool
	DueAt     *time.Time
	DueAtSet  bool
	StageID   *uuid.UUID
	StageSet  bool
	SortOrder *int
	Done      *bool
}

type TaskListResponse struct {
	Items []models.ParticipantTask `json:"items"`
}

type ApplyTemplateRequest struct {
	TemplateID string `json:"template_id" example:"preparation"`
}

type TemplateListResponse struct {
	Items []models.ChecklistTemplate `json:"items"`
}

type SaveNoteRequest struct {
	Body string `json:"body" example:"Draft notes in Markdown"`
}

type CreateArtifactRequest struct {
	Kind      models.ArtifactKind `json:"kind" enums:"REPOSITORY,VIDEO,SLIDES,DEMO,SUBMISSION,OTHER"`
	URL       string              `json:"url" example:"https://github.com/example/project"`
	Title     *string             `json:"title,omitempty" example:"Project repository"`
	SortOrder *int                `json:"sort_order,omitempty" example:"0"`
}

type UpdateArtifactRequest struct {
	Kind       *models.ArtifactKind `json:"kind,omitempty" enums:"REPOSITORY,VIDEO,SLIDES,DEMO,SUBMISSION,OTHER"`
	URL        *string              `json:"url,omitempty" example:"https://github.com/example/project"`
	Title      *string              `json:"title,omitempty" example:"Project repository"`
	ClearTitle bool                 `json:"clear_title,omitempty" example:"false"`
	SortOrder  *int                 `json:"sort_order,omitempty" example:"0"`
	Submitted  *bool                `json:"submitted,omitempty" example:"true"`
}

type ArtifactPatch struct {
	Kind      *models.ArtifactKind
	URL       *string
	Title     *string
	TitleSet  bool
	SortOrder *int
	Submitted *bool
}

type ArtifactListResponse struct {
	Items []models.ParticipantArtifact `json:"items"`
}

type SaveOutcomeRequest struct {
	Outcome *models.Outcome `json:"outcome,omitempty" enums:"PARTICIPATED,SHORTLISTED,WINNER,PRIZE"`
	Place   *int            `json:"place,omitempty" example:"2"`
	Prize   *string         `json:"prize,omitempty" example:"Jury award"`
	Track   *string         `json:"track,omitempty" example:"Smart city"`
	Note    *string         `json:"note,omitempty"`
}

type BookmarkListResponse struct {
	Items []CatalogEvent `json:"items"`
	Meta  PageMeta       `json:"meta"`
}

type HistoryItem struct {
	EventID    string                       `json:"event_id" example:"ev_gma9hq8a96q5"`
	Title      string                       `json:"title" example:"National event"`
	Kind       models.EventKind             `json:"kind" enums:"HACKATHON,MEETUP"`
	StartAt    time.Time                    `json:"start_at"`
	EndAt      time.Time                    `json:"end_at"`
	TeamRole   *string                      `json:"team_role,omitempty" example:"Backend developer"`
	Joined     bool                         `json:"joined" example:"true"`
	Outcome    *models.ParticipantOutcome   `json:"outcome,omitempty"`
	Artifacts  []models.ParticipantArtifact `json:"artifacts"`
	TasksTotal int                          `json:"tasks_total" example:"12"`
	TasksDone  int                          `json:"tasks_done" example:"9"`
}

type HistoryResponse struct {
	Items []HistoryItem `json:"items"`
	Meta  PageMeta      `json:"meta"`
}

type SaveRetrospectiveRequest struct {
	WentWell  *string `json:"went_well,omitempty"`
	WentBadly *string `json:"went_badly,omitempty"`
	NextTime  *string `json:"next_time,omitempty"`
}
