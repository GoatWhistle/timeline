package dto

import (
	"time"
)

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
