package dto

import (
	"github.com/GoatWhistle/timeline/internal/models"
	"time"
)

type NotificationHistoryItem struct {
	ID          string                    `json:"id" example:"nt_42ej2s5gh7e8"`
	Type        models.NotificationType   `json:"type" enums:"REGISTRATION_REQUIRED,REGISTRATION_REMINDER,REGISTRATION_OVERDUE"`
	Status      models.NotificationStatus `json:"status" enums:"PENDING,PROCESSING,SENT,FAILED,CANCELLED,UNDELIVERABLE"`
	Channel     *models.Channel           `json:"channel,omitempty" enums:"TELEGRAM,EMAIL"`
	EventTitle  *string                   `json:"event_title,omitempty" example:"Demo Day"`
	Preview     *string                   `json:"preview,omitempty" example:"The registration deadline is approaching"`
	Redacted    bool                      `json:"redacted" example:"false"`
	ScheduledAt time.Time                 `json:"scheduled_at"`
	SentAt      *time.Time                `json:"sent_at,omitempty"`
	CreatedAt   time.Time                 `json:"created_at"`
}

type NotificationHistoryResponse struct {
	Items []NotificationHistoryItem `json:"items"`
	Meta  PageMeta                  `json:"meta"`
}
