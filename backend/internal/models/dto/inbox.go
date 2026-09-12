package dto

import "time"

type InboxAction struct {
	Kind string  `json:"kind" enums:"OPEN,MARK_REGISTERED" example:"OPEN"`
	Href *string `json:"href,omitempty" example:"ev_gma9hq8a96q5"`
}

type InboxSubject struct {
	Kind string `json:"kind" enums:"event,team,task" example:"event"`
	ID   string `json:"id" example:"ev_gma9hq8a96q5"`
}

type InboxItemResponse struct {
	ID         string        `json:"id" example:"ib_42ej2s5gh7e8"`
	Kind       string        `json:"kind" example:"notification.primary"`
	Title      string        `json:"title" example:"Registration required for Timeline Hack"`
	BodyMD     string        `json:"body_md" example:"Deadline: **12.09.2026 18:00** (Europe/Moscow)"`
	Subject    *InboxSubject `json:"subject,omitempty"`
	Actions    []InboxAction `json:"actions"`
	ReadAt     *time.Time    `json:"read_at,omitempty"`
	DeletedAt  *time.Time    `json:"deleted_at,omitempty"`
	LogicalKey string        `json:"logical_key" example:"required:9f1c...:av1:rv1:cv1:chEMAIL"`
	CreatedAt  time.Time     `json:"created_at"`
}

type InboxPage struct {
	Items []InboxItemResponse `json:"items"`
	Meta  PageMeta            `json:"meta"`
}

type InboxMarkReadRequest struct {
	IDs []string `json:"ids" example:"ib_42ej2s5gh7e8"`
}

type InboxDeleteRequest struct {
	IDs []string `json:"ids" example:"ib_42ej2s5gh7e8"`
}
