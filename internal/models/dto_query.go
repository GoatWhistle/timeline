package models

import (
	"time"

	"github.com/google/uuid"
)

// MyHackathonItem — строка списка «Мои хакатоны».
type MyHackathonItem struct {
	ID                   uuid.UUID                `json:"id"`
	Title                string                   `json:"title" example:"Всероссийский хакатон"`
	Organizer            *string                  `json:"organizer,omitempty"`
	StartAt              time.Time                `json:"start_at"`
	EndAt                time.Time                `json:"end_at"`
	State                HackathonState           `json:"state" enums:"UPCOMING,ACTIVE,FINISHED,ARCHIVED"`
	TeamRole             string                   `json:"team_role" example:"Разработчик"`
	RegistrationURL      *string                  `json:"registration_url,omitempty"`
	RegistrationDeadline *time.Time               `json:"registration_deadline,omitempty"`
	RegistrationStatus   *RegistrationStatusShort `json:"registration_status,omitempty"`
	NextStage            *StageShort              `json:"next_stage,omitempty"`
}

// StageShort — краткое представление этапа.
type StageShort struct {
	ID      uuid.UUID `json:"id"`
	Name    string    `json:"name" example:"Приём заявок"`
	Type    StageType `json:"type"`
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
}

// MyHackathonPage — страница списка «Мои хакатоны».
type MyHackathonPage struct {
	Items []MyHackathonItem `json:"items"`
	Meta  PageMeta          `json:"meta"`
}

// HackathonCard — карточка назначенного хакатона для пользователя.
type HackathonCard struct {
	Hackathon          HackathonResponse        `json:"hackathon"`
	TeamRole           string                   `json:"team_role" example:"Разработчик"`
	Stages             []StageResponse          `json:"stages"`
	NextStage          *StageShort              `json:"next_stage,omitempty"`
	Registration       *RegistrationPublic      `json:"registration,omitempty"`
	RegistrationStatus *RegistrationStatusShort `json:"registration_status,omitempty"`
	CanMarkDone        bool                     `json:"can_mark_done" example:"true"`
}

// RegistrationPublic — данные регистрации, доступные участнику.
type RegistrationPublic struct {
	URL         string            `json:"url" example:"https://example.com/register"`
	DeadlineAt  time.Time         `json:"deadline_at"`
	Description *string           `json:"description,omitempty"`
	State       RegistrationState `json:"state" enums:"ACTIVE,DISABLED"`
}

// TimelineItem — интервал этапа на временной шкале.
type TimelineItem struct {
	ID      uuid.UUID `json:"id"`
	Name    string    `json:"name" example:"Приём заявок"`
	Type    StageType `json:"type"`
	StartAt time.Time `json:"start_at"`
	EndAt   time.Time `json:"end_at"`
}

// TimelineRow — одна строка временной шкалы: хакатон, его этапы и маркер дедлайна.
type TimelineRow struct {
	HackathonID          uuid.UUID      `json:"hackathon_id"`
	Title                string         `json:"title" example:"Всероссийский хакатон"`
	State                HackathonState `json:"state"`
	StartAt              time.Time      `json:"start_at"`
	EndAt                time.Time      `json:"end_at"`
	TeamRole             *string        `json:"team_role,omitempty"`
	Stages               []TimelineItem `json:"stages"`
	RegistrationDeadline *time.Time     `json:"registration_deadline,omitempty"`
}

// TimelineResponse — временная шкала за запрошенный период.
type TimelineResponse struct {
	Range TimeRange     `json:"range"`
	Rows  []TimelineRow `json:"rows"`
}

// DeadlineItem — строка выборок ближайших и просроченных дедлайнов.
type DeadlineItem struct {
	HackathonID    uuid.UUID               `json:"hackathon_id"`
	HackathonTitle string                  `json:"hackathon_title"`
	ParticipantID  uuid.UUID               `json:"participant_id"`
	User           UserSummary             `json:"user"`
	DeadlineAt     time.Time               `json:"deadline_at"`
	Status         RegistrationStatusValue `json:"status" enums:"TODO,DONE,NOT_REQUIRED"`
	OverdueMinutes int                     `json:"overdue_minutes" example:"120"`
}

// DeadlinePage — страница выборки дедлайнов.
type DeadlinePage struct {
	Items []DeadlineItem `json:"items"`
	Meta  PageMeta       `json:"meta"`
}

// AuditResponse — запись журнала аудита.
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

// AuditPage — страница журнала аудита.
type AuditPage struct {
	Items []AuditResponse `json:"items"`
	Meta  PageMeta        `json:"meta"`
}

// HealthResponse — ответ проверки живости.
type HealthResponse struct {
	Status string    `json:"status" example:"ok"`
	Time   time.Time `json:"time"`
}

// ReadyResponse — ответ проверки готовности.
type ReadyResponse struct {
	Status   string `json:"status" example:"ready"`
	Database string `json:"database" example:"ok"`
}

// WorkerHeartbeatResponse — состояние фоновых процессов.
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
