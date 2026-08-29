package models

import "github.com/google/uuid"

type CreateResourceLinkRequest struct {
	Kind      string     `json:"kind" example:"RULES"`
	URL       string     `json:"url" example:"https://example.org/rules"`
	Title     *string    `json:"title,omitempty" example:"Rules and code of conduct"`
	StageID   *uuid.UUID `json:"stage_id,omitempty"`
	IsPinned  *bool      `json:"is_pinned,omitempty" example:"false"`
	SortOrder *int       `json:"sort_order,omitempty" example:"0"`
}

type UpdateResourceLinkRequest struct {
	Kind       *string    `json:"kind,omitempty" example:"RULES"`
	URL        *string    `json:"url,omitempty" example:"https://example.org/rules"`
	Title      *string    `json:"title,omitempty" example:"Rules and code of conduct"`
	ClearTitle bool       `json:"clear_title,omitempty" example:"false"`
	StageID    *uuid.UUID `json:"stage_id,omitempty"`
	ClearStage bool       `json:"clear_stage,omitempty" example:"false"`
	IsPinned   *bool      `json:"is_pinned,omitempty" example:"true"`
	SortOrder  *int       `json:"sort_order,omitempty" example:"0"`
}

type ResourceLinkPatch struct {
	Kind      *LinkKind
	URL       *string
	Title     *string
	TitleSet  bool
	StageID   *uuid.UUID
	StageSet  bool
	IsPinned  *bool
	SortOrder *int
}

type ResourceLinkListResponse struct {
	Items []ResourceLink `json:"items"`
}

type CreateParticipantLinkRequest struct {
	Kind      string  `json:"kind" example:"OTHER"`
	URL       string  `json:"url" example:"https://example.org/my-notes"`
	Title     *string `json:"title,omitempty" example:"My scratch notes"`
	SortOrder *int    `json:"sort_order,omitempty" example:"0"`
}

type UpdateParticipantLinkRequest struct {
	Kind       *string `json:"kind,omitempty" example:"OTHER"`
	URL        *string `json:"url,omitempty" example:"https://example.org/my-notes"`
	Title      *string `json:"title,omitempty" example:"My scratch notes"`
	ClearTitle bool    `json:"clear_title,omitempty" example:"false"`
	SortOrder  *int    `json:"sort_order,omitempty" example:"0"`
}

type ParticipantLinkPatch struct {
	Kind      *LinkKind
	URL       *string
	Title     *string
	TitleSet  bool
	SortOrder *int
}

type ParticipantLinkListResponse struct {
	Items []ParticipantLink `json:"items"`
}
