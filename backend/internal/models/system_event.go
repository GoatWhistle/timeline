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
