package models

import (
	"time"

	"github.com/google/uuid"
)

// Hackathon — хакатон (раздел 5.1 ТЗ).
type Hackathon struct {
	ID          uuid.UUID  `json:"id"`
	Title       string     `json:"title"`
	Description *string    `json:"description,omitempty"`
	Organizer   *string    `json:"organizer,omitempty"`
	WebsiteURL  *string    `json:"website_url,omitempty"`
	Notes       *string    `json:"notes,omitempty"`
	StartAt     time.Time  `json:"start_at"`
	EndAt       time.Time  `json:"end_at"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	ArchivedAt  *time.Time `json:"archived_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// State возвращает вычисляемое состояние хакатона.
// ARCHIVED имеет приоритет над вычисляемым состоянием (раздел 5.1 ТЗ).
func (h *Hackathon) State(now time.Time) HackathonState {
	switch {
	case h.ArchivedAt != nil:
		return HackathonArchived
	case h.PublishedAt == nil:
		return HackathonUnpublished
	case now.Before(h.StartAt):
		return HackathonUpcoming
	case now.After(h.EndAt):
		return HackathonFinished
	default:
		return HackathonActive
	}
}

// Published сообщает, что хакатон опубликован.
func (h *Hackathon) Published() bool { return h.PublishedAt != nil }

// Archived сообщает, что хакатон архивирован.
func (h *Hackathon) Archived() bool { return h.ArchivedAt != nil }

// Schedulable сообщает, что для хакатона допускается создание уведомлений:
// он опубликован и не архивирован (раздел 9.4 ТЗ).
func (h *Hackathon) Schedulable() bool { return h.Published() && !h.Archived() }

// Stage — этап хакатона (раздел 5.2 ТЗ). Уведомлений не порождает.
type Stage struct {
	ID          uuid.UUID `json:"id"`
	HackathonID uuid.UUID `json:"hackathon_id"`
	Name        string    `json:"name"`
	Type        StageType `json:"type"`
	StartAt     time.Time `json:"start_at"`
	EndAt       time.Time `json:"end_at"`
	Description *string   `json:"description,omitempty"`
	URL         *string   `json:"url,omitempty"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// HackathonParticipant — назначение пользователя на хакатон (раздел 6 ТЗ).
type HackathonParticipant struct {
	ID                  uuid.UUID           `json:"id"`
	HackathonID         uuid.UUID           `json:"hackathon_id"`
	UserID              uuid.UUID           `json:"user_id"`
	TeamRole            string              `json:"team_role"`
	ParticipationStatus ParticipationStatus `json:"participation_status"`
	AssignmentVersion   int                 `json:"assignment_version"`
	AssignedAt          time.Time           `json:"assigned_at"`
	RemovedAt           *time.Time          `json:"removed_at,omitempty"`
	CreatedAt           time.Time           `json:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at"`
}

// Assigned сообщает, что участие активно.
func (p *HackathonParticipant) Assigned() bool {
	return p.ParticipationStatus == ParticipationAssigned
}
