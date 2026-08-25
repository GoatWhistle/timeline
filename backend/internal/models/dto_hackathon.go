package models

import (
	"time"

	"github.com/google/uuid"
)

// HackathonResponse — хакатон в административных ответах.
// Поле notes отдаётся только администратору.
type HackathonResponse struct {
	ID          uuid.UUID      `json:"id"`
	Title       string         `json:"title" example:"Всероссийский хакатон"`
	Description *string        `json:"description,omitempty"`
	Organizer   *string        `json:"organizer,omitempty" example:"Оргкомитет"`
	WebsiteURL  *string        `json:"website_url,omitempty" example:"https://example.com"`
	Notes       *string        `json:"notes,omitempty"`
	StartAt     time.Time      `json:"start_at"`
	EndAt       time.Time      `json:"end_at"`
	State       HackathonState `json:"state" enums:"UNPUBLISHED,UPCOMING,ACTIVE,FINISHED,ARCHIVED"`
	PublishedAt *time.Time     `json:"published_at,omitempty"`
	ArchivedAt  *time.Time     `json:"archived_at,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

// HackathonPage — страница списка хакатонов.
type HackathonPage struct {
	Items []HackathonResponse `json:"items"`
	Meta  PageMeta            `json:"meta"`
}

// CreateHackathonRequest — создание хакатона.
type CreateHackathonRequest struct {
	Title       string    `json:"title" example:"Всероссийский хакатон"`
	Description *string   `json:"description,omitempty"`
	Organizer   *string   `json:"organizer,omitempty"`
	WebsiteURL  *string   `json:"website_url,omitempty" example:"https://example.com"`
	Notes       *string   `json:"notes,omitempty"`
	StartAt     time.Time `json:"start_at"`
	EndAt       time.Time `json:"end_at"`
}

// UpdateHackathonRequest — частичное изменение хакатона.
// Изменение end_at увеличивает schedule_version регистрации и запускает согласование.
type UpdateHackathonRequest struct {
	Title       *string    `json:"title,omitempty"`
	Description *string    `json:"description,omitempty"`
	Organizer   *string    `json:"organizer,omitempty"`
	WebsiteURL  *string    `json:"website_url,omitempty"`
	Notes       *string    `json:"notes,omitempty"`
	StartAt     *time.Time `json:"start_at,omitempty"`
	EndAt       *time.Time `json:"end_at,omitempty"`
}

// StageResponse — этап хакатона.
type StageResponse struct {
	ID          uuid.UUID `json:"id"`
	HackathonID uuid.UUID `json:"hackathon_id"`
	Name        string    `json:"name" example:"Приём заявок"`
	Type        StageType `json:"type" enums:"REGISTRATION,SELECTION,PARTICIPATION,CHECKPOINT,SUBMISSION,DEMO,RESULTS,OTHER"`
	StartAt     time.Time `json:"start_at"`
	EndAt       time.Time `json:"end_at"`
	Description *string   `json:"description,omitempty"`
	URL         *string   `json:"url,omitempty" example:"https://example.com/stage"`
	SortOrder   int       `json:"sort_order" example:"0"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateStageRequest — создание этапа.
type CreateStageRequest struct {
	Name        string    `json:"name" example:"Приём заявок"`
	Type        StageType `json:"type" enums:"REGISTRATION,SELECTION,PARTICIPATION,CHECKPOINT,SUBMISSION,DEMO,RESULTS,OTHER"`
	StartAt     time.Time `json:"start_at"`
	EndAt       time.Time `json:"end_at"`
	Description *string   `json:"description,omitempty"`
	URL         *string   `json:"url,omitempty"`
	SortOrder   *int      `json:"sort_order,omitempty"`
}

// UpdateStageRequest — частичное изменение этапа.
type UpdateStageRequest struct {
	Name        *string    `json:"name,omitempty"`
	Type        *StageType `json:"type,omitempty" enums:"REGISTRATION,SELECTION,PARTICIPATION,CHECKPOINT,SUBMISSION,DEMO,RESULTS,OTHER"`
	StartAt     *time.Time `json:"start_at,omitempty"`
	EndAt       *time.Time `json:"end_at,omitempty"`
	Description *string    `json:"description,omitempty"`
	URL         *string    `json:"url,omitempty"`
	SortOrder   *int       `json:"sort_order,omitempty"`
}
