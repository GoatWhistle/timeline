package models

import (
	"time"

	"github.com/google/uuid"
)

type MyEventItem struct {
	ID                   uuid.UUID                `json:"id"`
	Title                string                   `json:"title" example:"National event"`
	Organizer            *string                  `json:"organizer,omitempty"`
	StartAt              time.Time                `json:"start_at"`
	EndAt                time.Time                `json:"end_at"`
	State                EventState               `json:"state" enums:"UPCOMING,ACTIVE,FINISHED,ARCHIVED"`
	TeamRole             *string                  `json:"team_role,omitempty" example:"Developer"`
	RegistrationURL      *string                  `json:"registration_url,omitempty"`
	RegistrationDeadline *time.Time               `json:"registration_deadline,omitempty"`
	RegistrationStatus   *RegistrationStatusShort `json:"registration_status,omitempty"`
	NextStage            *StageShort              `json:"next_stage,omitempty"`
}

type StageShort struct {
	ID      uuid.UUID `json:"id"`
	Name    string    `json:"name" example:"Call for applications"`
	Type    StageType `json:"type"`
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
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
	URL         string            `json:"url" example:"https://example.com/register"`
	DeadlineAt  time.Time         `json:"deadline_at"`
	Description *string           `json:"description,omitempty"`
	State       RegistrationState `json:"state" enums:"ACTIVE,DISABLED"`
}

type TimelineItem struct {
	ID      uuid.UUID `json:"id"`
	Name    string    `json:"name" example:"Call for applications"`
	Type    StageType `json:"type"`
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
}

type TimelineRow struct {
	EventID              uuid.UUID      `json:"event_id"`
	Title                string         `json:"title" example:"National event"`
	State                EventState     `json:"state"`
	StartAt              time.Time      `json:"start_at"`
	EndAt                time.Time      `json:"end_at"`
	TeamRole             *string        `json:"team_role,omitempty"`
	Stages               []TimelineItem `json:"stages"`
	RegistrationDeadline *time.Time     `json:"registration_deadline,omitempty"`
}

type TimelineResponse struct {
	Range TimeRange     `json:"range"`
	Rows  []TimelineRow `json:"rows"`
}

type DeadlineItem struct {
	EventID        uuid.UUID               `json:"event_id"`
	EventTitle     string                  `json:"event_title"`
	ParticipantID  uuid.UUID               `json:"participant_id"`
	User           UserSummary             `json:"user"`
	DeadlineAt     time.Time               `json:"deadline_at"`
	Status         RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	OverdueMinutes int                     `json:"overdue_minutes" example:"120"`
}

type DeadlinePage struct {
	Items []DeadlineItem `json:"items"`
	Meta  PageMeta       `json:"meta"`
}

type AuditResponse struct {
	ID          uuid.UUID   `json:"id"`
	ActorUserID *uuid.UUID  `json:"actor_user_id,omitempty"`
	ActorEmail  *string     `json:"actor_email,omitempty"`
	Action      AuditAction `json:"action" example:"STATUS_CHANGE"`
	EntityType  EntityType  `json:"entity_type" example:"REGISTRATION_STATUS"`
	EntityID    *uuid.UUID  `json:"entity_id,omitempty"`
	Before      any         `json:"before,omitempty"`
	After       any         `json:"after,omitempty"`
	RequestID   *string     `json:"request_id,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
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
