package models

import (
	"time"

	"github.com/google/uuid"
)

type NotificationHistoryItem struct {
	ID          uuid.UUID          `json:"id"`
	Type        NotificationType   `json:"type" enums:"REGISTRATION_REQUIRED,REGISTRATION_REMINDER,REGISTRATION_OVERDUE"`
	Status      NotificationStatus `json:"status" enums:"PENDING,PROCESSING,SENT,FAILED,CANCELLED,UNDELIVERABLE"`
	Channel     *Channel           `json:"channel,omitempty" enums:"TELEGRAM,EMAIL"`
	EventTitle  *string            `json:"event_title,omitempty" example:"Demo Day"`
	Preview     *string            `json:"preview,omitempty" example:"The registration deadline is approaching"`
	Redacted    bool               `json:"redacted" example:"false"`
	ScheduledAt time.Time          `json:"scheduled_at"`
	SentAt      *time.Time         `json:"sent_at,omitempty"`
	CreatedAt   time.Time          `json:"created_at"`
}

type NotificationHistoryResponse struct {
	Items []NotificationHistoryItem `json:"items"`
	Meta  PageMeta                  `json:"meta"`
}
