package models

import (
	"time"

	"github.com/google/uuid"
)

// ParticipantResponse — назначение участника с минимальными данными пользователя.
type ParticipantResponse struct {
	ID                  uuid.UUID                `json:"id"`
	HackathonID         uuid.UUID                `json:"hackathon_id"`
	User                UserSummary              `json:"user"`
	TeamRole            string                   `json:"team_role" example:"Разработчик"`
	ParticipationStatus ParticipationStatus      `json:"participation_status" enums:"ASSIGNED,REMOVED"`
	AssignmentVersion   int                      `json:"assignment_version" example:"1"`
	AssignedAt          time.Time                `json:"assigned_at"`
	RemovedAt           *time.Time               `json:"removed_at,omitempty"`
	RegistrationStatus  *RegistrationStatusShort `json:"registration_status,omitempty"`
}

// RegistrationStatusShort — статус регистрации участника в списках.
type RegistrationStatusShort struct {
	ID           uuid.UUID               `json:"id"`
	Status       RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	TodoCycle    int                     `json:"todo_cycle" example:"1"`
	RegisteredAt *time.Time              `json:"registered_at,omitempty"`
	Note         *string                 `json:"note,omitempty"`
}

// ParticipantPage — страница списка участников.
type ParticipantPage struct {
	Items []ParticipantResponse `json:"items"`
	Meta  PageMeta              `json:"meta"`
}

// AddParticipantItem — один элемент массового добавления.
type AddParticipantItem struct {
	UserID   uuid.UUID `json:"user_id"`
	TeamRole string    `json:"team_role" example:"Разработчик"`
}

// AddParticipantsRequest — массовое добавление участников.
// Повторное добавление удалённого участника реактивирует запись.
type AddParticipantsRequest struct {
	Items []AddParticipantItem `json:"items"`
}

// RemoveParticipantsRequest — массовое удаление участников.
type RemoveParticipantsRequest struct {
	ParticipantIDs []uuid.UUID `json:"participant_ids"`
}

// UpdateTeamRoleRequest — изменение функции участника на хакатоне.
type UpdateTeamRoleRequest struct {
	TeamRole string `json:"team_role" example:"Капитан"`
}

// CopyParticipantsRequest — копирование состава из другого хакатона.
// Переносятся только ASSIGNED участники; роль можно переопределить до сохранения.
type CopyParticipantsRequest struct {
	SourceHackathonID uuid.UUID          `json:"source_hackathon_id"`
	Overrides         []CopyRoleOverride `json:"overrides,omitempty"`
}

// CopyRoleOverride — переопределение роли для конкретного пользователя при копировании.
type CopyRoleOverride struct {
	UserID   uuid.UUID `json:"user_id"`
	TeamRole string    `json:"team_role" example:"Ментор"`
}
