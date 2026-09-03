package dto

import (
	"time"

	"github.com/GoatWhistle/timeline/internal/models"

	"github.com/google/uuid"
)

type MyEventItem struct {
	ID                   string                   `json:"id" example:"ev_gma9hq8a96q5"`
	Title                string                   `json:"title" example:"National event"`
	Organizer            *string                  `json:"organizer,omitempty"`
	StartAt              time.Time                `json:"start_at"`
	EndAt                time.Time                `json:"end_at"`
	State                models.EventState        `json:"state" enums:"UPCOMING,ACTIVE,FINISHED,ARCHIVED"`
	TeamRole             *string                  `json:"team_role,omitempty" example:"Developer"`
	RegistrationURL      *string                  `json:"registration_url,omitempty"`
	RegistrationDeadline *time.Time               `json:"registration_deadline,omitempty"`
	RegistrationStatus   *RegistrationStatusShort `json:"registration_status,omitempty"`
	NextStage            *StageShort              `json:"next_stage,omitempty"`
	Color                *models.EventColor       `json:"color,omitempty"`
}

type StageShort struct {
	ID      string           `json:"id" example:"st_42ej2s5gh7e8"`
	Name    string           `json:"name" example:"Call for applications"`
	Type    models.StageType `json:"type"`
	StartAt time.Time        `json:"start_at"`
	EndAt   time.Time        `json:"end_at"`
}

type MyEventPage struct {
	Items []MyEventItem `json:"items"`
	Meta  PageMeta      `json:"meta"`
}

type EventCard struct {
	Event              EventResponse            `json:"event"`
	TeamRole           *string                  `json:"team_role,omitempty" example:"Developer"`
	Stages             []StageResponse          `json:"stages"`
	NextStage          *StageShort              `json:"next_stage,omitempty"`
	Registration       *RegistrationPublic      `json:"registration,omitempty"`
	RegistrationStatus *RegistrationStatusShort `json:"registration_status,omitempty"`
	CanMarkDone        bool                     `json:"can_mark_done" example:"true"`
}

type RegistrationPublic struct {
	URL         string                   `json:"url" example:"https://example.com/register"`
	DeadlineAt  time.Time                `json:"deadline_at"`
	Description *string                  `json:"description,omitempty"`
	State       models.RegistrationState `json:"state" enums:"ACTIVE,DISABLED"`
}

type ScheduleItem struct {
	ID        string           `json:"id" example:"st_42ej2s5gh7e8"`
	StageUUID uuid.UUID        `json:"-"`
	Name      string           `json:"name" example:"Call for applications"`
	Type      models.StageType `json:"type"`
	StartAt   time.Time        `json:"start_at"`
	EndAt     time.Time        `json:"end_at"`
	Place     models.Place     `json:"place"`
}

type ScheduleRow struct {
	EventID              string                   `json:"event_id" example:"ev_gma9hq8a96q5"`
	EventUUID            uuid.UUID                `json:"-"`
	Title                string                   `json:"title" example:"National event"`
	Kind                 models.EventKind         `json:"kind" enums:"HACKATHON,MEETUP"`
	WebsiteURL           *string                  `json:"website_url,omitempty"`
	State                models.EventState        `json:"state"`
	StartAt              time.Time                `json:"start_at"`
	EndAt                time.Time                `json:"end_at"`
	TeamRole             *string                  `json:"team_role,omitempty"`
	EffectiveFormat      models.EventFormat       `json:"effective_format" enums:"ONLINE,OFFLINE,HYBRID"`
	Stages               []ScheduleItem           `json:"stages"`
	RegistrationDeadline *time.Time               `json:"registration_deadline,omitempty"`
	RegistrationStatus   *RegistrationStatusShort `json:"registration_status,omitempty"`
	Color                *models.EventColor       `json:"color,omitempty"`
}

type ScheduleResponse struct {
	Range TimeRange     `json:"range"`
	Rows  []ScheduleRow `json:"rows"`
}

type DeadlineItem struct {
	EventID        string                         `json:"event_id" example:"ev_gma9hq8a96q5"`
	EventTitle     string                         `json:"event_title"`
	ParticipantID  string                         `json:"participant_id" example:"pa_42ej2s5gh7e8"`
	User           UserSummary                    `json:"user"`
	DeadlineAt     time.Time                      `json:"deadline_at"`
	Status         models.RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	OverdueMinutes int                            `json:"overdue_minutes" example:"120"`
}

type DeadlinePage struct {
	Items []DeadlineItem `json:"items"`
	Meta  PageMeta       `json:"meta"`
}

type AuditResponse struct {
	ID          uuid.UUID          `json:"id"`
	ActorUserID *uuid.UUID         `json:"actor_user_id,omitempty"`
	ActorEmail  *string            `json:"actor_email,omitempty"`
	Action      models.AuditAction `json:"action" example:"STATUS_CHANGE"`
	EntityType  models.EntityType  `json:"entity_type" example:"REGISTRATION_STATUS"`
	EntityID    *uuid.UUID         `json:"entity_id,omitempty"`
	Before      any                `json:"before,omitempty"`
	After       any                `json:"after,omitempty"`
	RequestID   *string            `json:"request_id,omitempty"`
	CreatedAt   time.Time          `json:"created_at"`
}

type AuditPage struct {
	Items []AuditResponse `json:"items"`
	Meta  PageMeta        `json:"meta"`
}

type HealthResponse struct {
	Status string    `json:"status" example:"ok"`
	Time   time.Time `json:"time"`
}

type ReadyResponse struct {
	Status   string `json:"status" example:"ready"`
	Database string `json:"database" example:"ok"`
}

type WorkerHeartbeatResponse struct {
	SchedulerLastRunAt *time.Time `json:"scheduler_last_run_at,omitempty"`
	WorkerLastRunAt    *time.Time `json:"worker_last_run_at,omitempty"`
	PendingCount       int64      `json:"pending_count" example:"3"`
	ProcessingCount    int64      `json:"processing_count" example:"1"`
	FailedCount        int64      `json:"failed_count" example:"0"`
	UndeliverableCount int64      `json:"undeliverable_count" example:"0"`
	OldestPendingAgeS  float64    `json:"oldest_pending_age_seconds" example:"12.5"`
	Healthy            bool       `json:"healthy" example:"true"`
}

type QueueEntryResponse struct {
	ID               string                    `json:"id" example:"nt_42ej2s5gh7e8"`
	NotificationType models.NotificationType   `json:"notification_type"`
	Status           models.NotificationStatus `json:"status"`
	RequestedChannel models.Channel            `json:"requested_channel" enums:"TELEGRAM,EMAIL"`
	ActualChannel    *models.Channel           `json:"actual_channel,omitempty" enums:"TELEGRAM,EMAIL"`
	FailedChannels   []models.Channel          `json:"failed_channels,omitempty"`
	AttemptCount     int                       `json:"attempt_count" example:"4"`
	ScheduledAt      time.Time                 `json:"scheduled_at"`
	LeaseExpiresAt   *time.Time                `json:"lease_expires_at,omitempty"`
	LeaseOverdueS    *float64                  `json:"lease_overdue_seconds,omitempty" example:"93.4"`
	LastError        *string                   `json:"last_error,omitempty" example:"permanent provider error"`
	CreatedAt        time.Time                 `json:"created_at"`
	UpdatedAt        time.Time                 `json:"updated_at"`
}

type QueueEntryPage struct {
	Items []QueueEntryResponse `json:"items"`
	Meta  PageMeta             `json:"meta"`
}

type RegistrationCoverage struct {
	Applicable       bool     `json:"applicable" example:"true"`
	EventsCovered    int64    `json:"events_covered" example:"4"`
	Total            int64    `json:"total" example:"12"`
	SelfReportedDone int64    `json:"self_reported_done" example:"9"`
	NotRequired      int64    `json:"not_required" example:"1"`
	Outstanding      int64    `json:"outstanding" example:"2"`
	Share            *float64 `json:"share,omitempty" example:"0.75"`
}
