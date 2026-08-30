package dto

import (
	"github.com/GoatWhistle/timeline/internal/models"
	"time"
)

type ParticipantResponse struct {
	ID                  string                     `json:"id" example:"pa_42ej2s5gh7e8"`
	EventID             string                     `json:"event_id" example:"ev_gma9hq8a96q5"`
	User                UserSummary                `json:"user"`
	TeamRole            *string                    `json:"team_role,omitempty" example:"Developer"`
	ParticipationStatus models.ParticipationStatus `json:"participation_status" enums:"ASSIGNED,REMOVED"`
	AssignmentVersion   int                        `json:"assignment_version" example:"1"`
	AssignedAt          time.Time                  `json:"assigned_at"`
	RemovedAt           *time.Time                 `json:"removed_at,omitempty"`
	RegistrationStatus  *RegistrationStatusShort   `json:"registration_status,omitempty"`
}

type RegistrationStatusShort struct {
	ID           string                         `json:"id" example:"rs_42ej2s5gh7e8"`
	Status       models.RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	TodoCycle    int                            `json:"todo_cycle" example:"1"`
	RegisteredAt *time.Time                     `json:"registered_at,omitempty"`
	Note         *string                        `json:"note,omitempty"`
}

type ParticipantPage struct {
	Items []ParticipantResponse `json:"items"`
	Meta  PageMeta              `json:"meta"`
}

type AddParticipantItem struct {
	UserID   string  `json:"user_id" example:"us_42ej2s5gh7e8"`
	TeamRole *string `json:"team_role,omitempty" example:"Developer"`
}

type AddParticipantsRequest struct {
	Items []AddParticipantItem `json:"items"`
}

type RemoveParticipantsRequest struct {
	ParticipantIDs []string `json:"participant_ids" example:"pa_42ej2s5gh7e8"`
}

type UpdateTeamRoleRequest struct {
	TeamRole *string `json:"team_role,omitempty" example:"Captain"`
}

type CopyParticipantsRequest struct {
	SourceEventID string             `json:"source_event_id" example:"ev_gma9hq8a96q5"`
	Overrides     []CopyRoleOverride `json:"overrides,omitempty"`
}

type CopyRoleOverride struct {
	UserID   string  `json:"user_id" example:"us_42ej2s5gh7e8"`
	TeamRole *string `json:"team_role,omitempty" example:"Mentor"`
}
