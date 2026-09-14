package models

import (
	"time"

	"github.com/google/uuid"
)

type Registration struct {
	ID                         uuid.UUID         `json:"id"`
	DisplayID                  string            `json:"display_id"`
	EventID                    uuid.UUID         `json:"event_id"`
	URL                        string            `json:"url"`
	DeadlineAt                 time.Time         `json:"deadline_at"`
	EventEndAt                 time.Time         `json:"-"`
	Description                *string           `json:"description,omitempty"`
	State                      RegistrationState `json:"state"`
	ScheduleVersion            int               `json:"schedule_version"`
	ActivationVersion          int               `json:"activation_version"`
	NotificationContentVersion int               `json:"notification_content_version"`
	CreatedAt                  time.Time         `json:"created_at"`
	UpdatedAt                  time.Time         `json:"updated_at"`
}

func (r *Registration) Active() bool { return r.State == RegistrationActive }

type RegistrationStatus struct {
	ID                  uuid.UUID               `json:"id"`
	DisplayID           string                  `json:"display_id"`
	EventID             uuid.UUID               `json:"event_id"`
	RegistrationID      uuid.UUID               `json:"registration_id"`
	ParticipantID       uuid.UUID               `json:"participant_id"`
	Status              RegistrationStatusValue `json:"status"`
	TodoCycle           int                     `json:"todo_cycle"`
	RegisteredAt        *time.Time              `json:"registered_at,omitempty"`
	LastChangeSource    ChangeSource            `json:"last_change_source"`
	LastChangedByUserID *uuid.UUID              `json:"last_changed_by_user_id,omitempty"`
	Note                *string                 `json:"note,omitempty"`
	CreatedAt           time.Time               `json:"created_at"`
	UpdatedAt           time.Time               `json:"updated_at"`
}
