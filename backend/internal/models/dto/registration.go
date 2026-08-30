package dto

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"

	"github.com/google/uuid"
)

type RegistrationResponse struct {
	ID                         string                   `json:"id" example:"rg_42ej2s5gh7e8"`
	EventID                    string                   `json:"event_id" example:"ev_gma9hq8a96q5"`
	URL                        string                   `json:"url" example:"https://example.com/register"`
	DeadlineAt                 time.Time                `json:"deadline_at"`
	Description                *string                  `json:"description,omitempty"`
	State                      models.RegistrationState `json:"state" enums:"ACTIVE,DISABLED"`
	ScheduleVersion            int                      `json:"schedule_version" example:"1"`
	ActivationVersion          int                      `json:"activation_version" example:"1"`
	NotificationContentVersion int                      `json:"notification_content_version" example:"1"`
	CreatedAt                  time.Time                `json:"created_at"`
	UpdatedAt                  time.Time                `json:"updated_at"`
}

type CreateRegistrationRequest struct {
	URL         string    `json:"url" example:"https://example.com/register"`
	DeadlineAt  time.Time `json:"deadline_at"`
	Description *string   `json:"description,omitempty"`
}

type UpdateRegistrationRequest struct {
	URL         *string    `json:"url,omitempty"`
	DeadlineAt  *time.Time `json:"deadline_at,omitempty"`
	Description *string    `json:"description,omitempty"`
}

type RegistrationStatusResponse struct {
	ID                  string                         `json:"id" example:"rs_42ej2s5gh7e8"`
	EventID             string                         `json:"event_id" example:"ev_gma9hq8a96q5"`
	RegistrationID      string                         `json:"registration_id" example:"rg_42ej2s5gh7e8"`
	ParticipantID       string                         `json:"participant_id" example:"pa_42ej2s5gh7e8"`
	User                *UserSummary                   `json:"user,omitempty"`
	Status              models.RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	TodoCycle           int                            `json:"todo_cycle" example:"1"`
	RegisteredAt        *time.Time                     `json:"registered_at,omitempty"`
	LastChangeSource    models.ChangeSource            `json:"last_change_source" enums:"SYSTEM,USER,ADMIN"`
	LastChangedByUserID *string                        `json:"last_changed_by_user_id,omitempty" example:"us_42ej2s5gh7e8"`
	Note                *string                        `json:"note,omitempty"`
	UpdatedAt           time.Time                      `json:"updated_at"`
}

type RegistrationStatusPage struct {
	Items []RegistrationStatusResponse `json:"items"`
	Meta  PageMeta                     `json:"meta"`
}

type AdminChangeStatusRequest struct {
	Status models.RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	Note   *string                        `json:"note,omitempty"`
}

type BatchSetStatusRequest struct {
	ParticipantIDs []string                       `json:"participant_ids" example:"pa_42ej2s5gh7e8"`
	Status         models.RegistrationStatusValue `json:"status" enums:"TODO,NOT_REQUIRED"`
	Note           *string                        `json:"note,omitempty"`
}

type NotificationRuleResponse struct {
	ID              string                  `json:"id" example:"nr_42ej2s5gh7e8"`
	RegistrationID  string                  `json:"registration_id" example:"rg_42ej2s5gh7e8"`
	OffsetMinutes   int                     `json:"offset_minutes" example:"1440"`
	Type            models.NotificationType `json:"type" enums:"REGISTRATION_REMINDER,REGISTRATION_OVERDUE"`
	Enabled         bool                    `json:"enabled" example:"true"`
	SlotNo          int                     `json:"slot_no" example:"1"`
	ChannelOverride *models.Channel         `json:"channel_override,omitempty" enums:"TELEGRAM,EMAIL"`
	CreatedAt       time.Time               `json:"created_at"`
	UpdatedAt       time.Time               `json:"updated_at"`
}

type CreateRuleRequest struct {
	OffsetMinutes   int     `json:"offset_minutes" example:"1440"`
	ChannelOverride *string `json:"channel_override,omitempty" enums:"TELEGRAM,EMAIL"`
	SlotNo          *int    `json:"slot_no,omitempty" example:"1"`
	Enabled         *bool   `json:"enabled,omitempty" example:"true"`
}

type UpdateRuleRequest struct {
	OffsetMinutes   *int    `json:"offset_minutes,omitempty"`
	ChannelOverride *string `json:"channel_override,omitempty" enums:"TELEGRAM,EMAIL"`
	Enabled         *bool   `json:"enabled,omitempty"`
}

type NotificationPreviewResponse struct {
	Type            models.NotificationType `json:"type"`
	RuleID          *uuid.UUID              `json:"rule_id,omitempty"`
	Language        string                  `json:"language" example:"ru"`
	Subject         string                  `json:"subject" example:"Timeline: register for the event"`
	Body            string                  `json:"body"`
	Channel         *models.Channel         `json:"channel,omitempty" enums:"TELEGRAM,EMAIL"`
	ChannelReady    bool                    `json:"channel_ready" example:"true"`
	EventTitle      string                  `json:"event_title" example:"Autumn hackathon"`
	RegistrationURL string                  `json:"registration_url" example:"https://example.com/register"`
	DeadlineUTC     time.Time               `json:"deadline_utc"`
	DeadlineLocal   string                  `json:"deadline_local" example:"14.09.2026 18:00"`
	TimezoneID      string                  `json:"timezone_id" example:"Europe/Moscow"`
	ScheduledAt     *time.Time              `json:"scheduled_at,omitempty"`
}
