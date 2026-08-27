package models

import (
	"time"

	"github.com/google/uuid"
)

type ParticipantResponse struct {
	ID                  uuid.UUID                `json:"id"`
	EventID             uuid.UUID                `json:"event_id"`
	User                UserSummary              `json:"user"`
	TeamRole            string                   `json:"team_role" example:"Developer"`
	ParticipationStatus ParticipationStatus      `json:"participation_status" enums:"ASSIGNED,REMOVED"`
	AssignmentVersion   int                      `json:"assignment_version" example:"1"`
	AssignedAt          time.Time                `json:"assigned_at"`
	RemovedAt           *time.Time               `json:"removed_at,omitempty"`
	RegistrationStatus  *RegistrationStatusShort `json:"registration_status,omitempty"`
}

type RegistrationStatusShort struct {
	ID           uuid.UUID               `json:"id"`
	Status       RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	TodoCycle    int                     `json:"todo_cycle" example:"1"`
	RegisteredAt *time.Time              `json:"registered_at,omitempty"`
	Note         *string                 `json:"note,omitempty"`
}

type ParticipantPage struct {
	Items []ParticipantResponse `json:"items"`
	Meta  PageMeta              `json:"meta"`
}

type AddParticipantItem struct {
	UserID   uuid.UUID `json:"user_id"`
	TeamRole string    `json:"team_role" example:"Developer"`
}

type AddParticipantsRequest struct {
	Items []AddParticipantItem `json:"items"`
}

type RemoveParticipantsRequest struct {
	ParticipantIDs []uuid.UUID `json:"participant_ids"`
}

type UpdateTeamRoleRequest struct {
	TeamRole string `json:"team_role" example:"Captain"`
}

type CopyParticipantsRequest struct {
	SourceEventID uuid.UUID          `json:"source_event_id"`
	Overrides     []CopyRoleOverride `json:"overrides,omitempty"`
}

type CopyRoleOverride struct {
	UserID   uuid.UUID `json:"user_id"`
	TeamRole string    `json:"team_role" example:"Mentor"`
}
