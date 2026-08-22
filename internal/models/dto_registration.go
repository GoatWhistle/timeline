package models

import (
	"time"

	"github.com/google/uuid"
)

// RegistrationResponse — регистрация хакатона с версиями расписания и контента.
type RegistrationResponse struct {
	ID                         uuid.UUID         `json:"id"`
	HackathonID                uuid.UUID         `json:"hackathon_id"`
	URL                        string            `json:"url" example:"https://example.com/register"`
	DeadlineAt                 time.Time         `json:"deadline_at"`
	Description                *string           `json:"description,omitempty"`
	State                      RegistrationState `json:"state" enums:"ACTIVE,DISABLED"`
	ScheduleVersion            int               `json:"schedule_version" example:"1"`
	ActivationVersion          int               `json:"activation_version" example:"1"`
	NotificationContentVersion int               `json:"notification_content_version" example:"1"`
	CreatedAt                  time.Time         `json:"created_at"`
	UpdatedAt                  time.Time         `json:"updated_at"`
}

// CreateRegistrationRequest — создание регистрации хакатона.
// Дедлайн обязан удовлетворять условию deadline_at <= hackathon.end_at.
type CreateRegistrationRequest struct {
	URL         string    `json:"url" example:"https://example.com/register"`
	DeadlineAt  time.Time `json:"deadline_at"`
	Description *string   `json:"description,omitempty"`
}

// UpdateRegistrationRequest — изменение регистрации.
// Изменение url увеличивает notification_content_version,
// изменение deadline_at — schedule_version.
type UpdateRegistrationRequest struct {
	URL         *string    `json:"url,omitempty"`
	DeadlineAt  *time.Time `json:"deadline_at,omitempty"`
	Description *string    `json:"description,omitempty"`
}

// RegistrationStatusResponse — статус регистрации участника.
type RegistrationStatusResponse struct {
	ID                  uuid.UUID               `json:"id"`
	HackathonID         uuid.UUID               `json:"hackathon_id"`
	RegistrationID      uuid.UUID               `json:"registration_id"`
	ParticipantID       uuid.UUID               `json:"participant_id"`
	User                *UserSummary            `json:"user,omitempty"`
	Status              RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	TodoCycle           int                     `json:"todo_cycle" example:"1"`
	RegisteredAt        *time.Time              `json:"registered_at,omitempty"`
	LastChangeSource    ChangeSource            `json:"last_change_source" enums:"SYSTEM,USER,ADMIN"`
	LastChangedByUserID *uuid.UUID              `json:"last_changed_by_user_id,omitempty"`
	Note                *string                 `json:"note,omitempty"`
	UpdatedAt           time.Time               `json:"updated_at"`
}

// RegistrationStatusPage — страница списка статусов.
type RegistrationStatusPage struct {
	Items []RegistrationStatusResponse `json:"items"`
	Meta  PageMeta                     `json:"meta"`
}

// AdminChangeStatusRequest — административный переход статуса.
type AdminChangeStatusRequest struct {
	Status RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	Note   *string                 `json:"note,omitempty"`
}

// BatchSetStatusRequest — массовая установка статуса участникам.
// Допускаются только TODO и NOT_REQUIRED (раздел 12 ТЗ).
type BatchSetStatusRequest struct {
	ParticipantIDs []uuid.UUID             `json:"participant_ids"`
	Status         RegistrationStatusValue `json:"status" enums:"TODO,NOT_REQUIRED"`
	Note           *string                 `json:"note,omitempty"`
}

// NotificationRuleResponse — правило напоминания.
type NotificationRuleResponse struct {
	ID              uuid.UUID        `json:"id"`
	RegistrationID  uuid.UUID        `json:"registration_id"`
	OffsetMinutes   int              `json:"offset_minutes" example:"1440"`
	Type            NotificationType `json:"type" enums:"REGISTRATION_REMINDER,REGISTRATION_OVERDUE"`
	Enabled         bool             `json:"enabled" example:"true"`
	SlotNo          int              `json:"slot_no" example:"1"`
	ChannelOverride *Channel         `json:"channel_override,omitempty" enums:"TELEGRAM,EMAIL"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

// CreateRuleRequest — создание правила напоминания.
// Знак offset_minutes определяет тип: положительный — напоминание до дедлайна,
// отрицательный — уведомление о просрочке.
type CreateRuleRequest struct {
	OffsetMinutes   int     `json:"offset_minutes" example:"1440"`
	ChannelOverride *string `json:"channel_override,omitempty" enums:"TELEGRAM,EMAIL"`
	SlotNo          *int    `json:"slot_no,omitempty" example:"1"`
	Enabled         *bool   `json:"enabled,omitempty" example:"true"`
}

// UpdateRuleRequest — изменение правила напоминания.
type UpdateRuleRequest struct {
	OffsetMinutes   *int    `json:"offset_minutes,omitempty"`
	ChannelOverride *string `json:"channel_override,omitempty" enums:"TELEGRAM,EMAIL"`
	Enabled         *bool   `json:"enabled,omitempty"`
}
