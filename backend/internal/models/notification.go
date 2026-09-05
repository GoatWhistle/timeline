package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	MaxAttemptCount      = 4
	MaxRuleSlots         = 10
	MaxRuleOffsetMinutes = 525600
)

type NotificationPayload struct {
	EventTitle      string    `json:"event_title"`
	RegistrationURL string    `json:"registration_url"`
	DeadlineUTC     time.Time `json:"deadline_utc"`
	DeadlineLocal   string    `json:"deadline_local"`
	TimezoneID      string    `json:"timezone_id"`
	Type            string    `json:"type"`
	Language        string    `json:"language"`
	Subject         string    `json:"subject"`
	Body            string    `json:"body"`
}

type Notification struct {
	ID                   uuid.UUID        `json:"id"`
	DisplayID            string           `json:"display_id"`
	NotificationType     NotificationType `json:"notification_type"`
	RecipientUserID      uuid.UUID        `json:"recipient_user_id"`
	RegistrationStatusID uuid.UUID        `json:"registration_status_id"`
	RuleID               *uuid.UUID       `json:"rule_id,omitempty"`

	ScheduleVersion            *int `json:"schedule_version,omitempty"`
	TodoCycle                  *int `json:"todo_cycle,omitempty"`
	AssignmentVersion          *int `json:"assignment_version,omitempty"`
	ActivationVersion          *int `json:"activation_version,omitempty"`
	NotificationContentVersion int  `json:"notification_content_version"`

	LogicalKey       string    `json:"logical_key"`
	RequestedChannel Channel   `json:"requested_channel"`
	ActualChannel    *Channel  `json:"actual_channel,omitempty"`
	FailedChannels   []Channel `json:"failed_channels,omitempty"`

	Status                NotificationStatus   `json:"status"`
	ScheduledAt           time.Time            `json:"scheduled_at"`
	NextAttemptAt         *time.Time           `json:"next_attempt_at,omitempty"`
	AttemptCount          int                  `json:"attempt_count"`
	LeaseExpiresAt        *time.Time           `json:"lease_expires_at,omitempty"`
	ProviderCallStartedAt *time.Time           `json:"provider_call_started_at,omitempty"`
	Payload               *NotificationPayload `json:"payload,omitempty"`
	LastError             *string              `json:"last_error,omitempty"`
	SentAt                *time.Time           `json:"sent_at,omitempty"`
	CreatedAt             time.Time            `json:"created_at"`
	UpdatedAt             time.Time            `json:"updated_at"`
}

func (n *Notification) Terminal() bool {
	switch n.Status {
	case NotificationSent, NotificationFailed, NotificationCancelled, NotificationUndeliverable:
		return true
	}
	return false
}

func (n *Notification) ChannelFailed(ch Channel) bool {
	for _, c := range n.FailedChannels {
		if c == ch {
			return true
		}
	}
	return false
}

type AuditLog struct {
	ID          uuid.UUID   `json:"id"`
	ActorUserID *uuid.UUID  `json:"actor_user_id,omitempty"`
	Action      AuditAction `json:"action"`
	EntityType  EntityType  `json:"entity_type"`
	EntityID    *uuid.UUID  `json:"entity_id,omitempty"`
	BeforeJSON  any         `json:"before,omitempty"`
	AfterJSON   any         `json:"after,omitempty"`
	RequestID   *string     `json:"request_id,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
}

type ReconcileCandidate struct {
	EventID           uuid.UUID
	EventTitle        string
	EventEndAt        time.Time
	RegistrationID    uuid.UUID
	RegistrationURL   string
	DeadlineAt        time.Time
	ScheduleVersion   int
	ActivationVersion int
	ContentVersion    int
	ParticipantID     uuid.UUID
	AssignmentVersion int
	StatusID          uuid.UUID
	TodoCycle         int
	RecipientID       uuid.UUID
	RecipientLocale   string
	RecipientTimezone string
	RecipientChannels RecipientChannels
}

type RecipientChannels struct {
	TelegramLinked bool
	EmailVerified  bool
	Selected       ChannelSet
	Preferences    NotificationPreferences
}

func (c RecipientChannels) Deliverable(occasion NotificationOccasion) ChannelSet {
	out := make(ChannelSet, 0, len(c.Selected))
	for _, ch := range AllChannels {
		if c.Selected.Has(ch) && c.Available(ch) && c.Preferences.Allows(occasion, ch) {
			out = append(out, ch)
		}
	}
	return out
}

func (c RecipientChannels) Wanted(occasion NotificationOccasion) ChannelSet {
	out := make(ChannelSet, 0, len(c.Selected))
	for _, ch := range AllChannels {
		if c.Selected.Has(ch) && c.Preferences.Allows(occasion, ch) {
			out = append(out, ch)
		}
	}
	return out
}

func (c RecipientChannels) Available(ch Channel) bool {
	switch ch {
	case ChannelTelegram:
		return c.TelegramLinked
	case ChannelEmail:
		return c.EmailVerified
	}
	return false
}

type OutboundMessage struct {
	IdempotencyKey string
	Recipient      string
	Subject        string
	Body           string
	HTML           string
}

type DeliveryError struct {
	Permanent bool
	Reason    string
	Err       error
}

func (e *DeliveryError) Error() string {
	if e.Err != nil {
		return e.Reason + ": " + e.Err.Error()
	}
	return e.Reason
}

func (e *DeliveryError) Unwrap() error { return e.Err }

func NewPermanentDeliveryError(reason string, err error) *DeliveryError {
	return &DeliveryError{Permanent: true, Reason: reason, Err: err}
}

func NewTemporaryDeliveryError(reason string, err error) *DeliveryError {
	return &DeliveryError{Permanent: false, Reason: reason, Err: err}
}
