package models

import (
	"time"

	"github.com/google/uuid"
)

type EventSeverity string

const (
	SeverityInfo     EventSeverity = "INFO"
	SeverityWarning  EventSeverity = "WARNING"
	SeverityCritical EventSeverity = "CRITICAL"
)

func (s EventSeverity) Valid() bool {
	return s == SeverityInfo || s == SeverityWarning || s == SeverityCritical
}

type AudienceKind string

const (
	AudienceAdmin AudienceKind = "ADMIN"
	AudienceUser  AudienceKind = "USER"
)

func (a AudienceKind) Valid() bool {
	return a == AudienceAdmin || a == AudienceUser
}

type SystemEventType string

const (
	EventNotificationFailed        SystemEventType = "NOTIFICATION_FAILED"
	EventNotificationUndeliverable SystemEventType = "NOTIFICATION_UNDELIVERABLE"
	EventWorkerStalled             SystemEventType = "WORKER_STALLED"
	EventWorkerRecovered           SystemEventType = "WORKER_RECOVERED"
	EventQueueAgeHigh              SystemEventType = "QUEUE_AGE_HIGH"
	EventQueueAgeNormal            SystemEventType = "QUEUE_AGE_NORMAL"
	EventRegistrationReminder      SystemEventType = "REGISTRATION_REMINDER"
	EventPersonalTaskDue           SystemEventType = "PERSONAL_TASK_DUE"
	EventPersonalRetrospectiveDue  SystemEventType = "PERSONAL_RETROSPECTIVE_DUE"
	EventWeeklyDigest              SystemEventType = "WEEKLY_DIGEST"
)

type SystemEvent struct {
	ID          uuid.UUID
	DisplayID   string
	Type        SystemEventType
	Severity    EventSeverity
	Audience    AudienceKind
	UserID      *uuid.UUID
	SubjectType *string
	SubjectID   *uuid.UUID
	Payload     map[string]any
	DedupKey    *string
	CreatedAt   time.Time
}

type SystemEventResponse struct {
	ID          string         `json:"id" example:"sy_42ej2s5gh7e8"`
	Type        string         `json:"type" example:"NOTIFICATION_FAILED"`
	Severity    string         `json:"severity" enums:"INFO,WARNING,CRITICAL" example:"WARNING"`
	SubjectType *string        `json:"subject_type,omitempty" example:"notification"`
	Payload     map[string]any `json:"payload"`
	Read        bool           `json:"read" example:"false"`
	CreatedAt   time.Time      `json:"created_at"`
}

type SystemEventPage struct {
	Items []SystemEventResponse `json:"items"`
	Meta  PageMeta              `json:"meta"`
}

type UnreadCountResponse struct {
	Unread int64 `json:"unread" example:"3"`
}

type MarkReadRequest struct {
	IDs []string `json:"ids" example:"sy_42ej2s5gh7e8"`
}

type InvalidationKey []string

const (
	RealtimeEnvelopeEvent      = "event"
	RealtimeEnvelopeInvalidate = "invalidate"
	RealtimeEnvelopeHello      = "hello"
)

type RealtimeEnvelope struct {
	Type       string               `json:"type"`
	Keys       []string             `json:"keys,omitempty"`
	Event      *SystemEventResponse `json:"event,omitempty"`
	ServerTime time.Time            `json:"server_time,omitempty"`
}

type RealtimeSubscription interface {
	Messages() <-chan RealtimeEnvelope
	Done() <-chan struct{}
	Close()
}
