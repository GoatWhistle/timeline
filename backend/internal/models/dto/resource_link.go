package dto

import (
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/google/uuid"
)

type CreateResourceLinkRequest struct {
	Kind      string  `json:"kind" example:"RULES"`
	URL       string  `json:"url" example:"https://example.org/rules"`
	Title     *string `json:"title,omitempty" example:"Rules and code of conduct"`
	StageID   *string `json:"stage_id,omitempty" example:"st_42ej2s5gh7e8"`
	IsPinned  *bool   `json:"is_pinned,omitempty" example:"false"`
	SortOrder *int    `json:"sort_order,omitempty" example:"0"`
}

type UpdateResourceLinkRequest struct {
	Kind       *string `json:"kind,omitempty" example:"RULES"`
	URL        *string `json:"url,omitempty" example:"https://example.org/rules"`
	Title      *string `json:"title,omitempty" example:"Rules and code of conduct"`
	ClearTitle bool    `json:"clear_title,omitempty" example:"false"`
	StageID    *string `json:"stage_id,omitempty" example:"st_42ej2s5gh7e8"`
	ClearStage bool    `json:"clear_stage,omitempty" example:"false"`
	IsPinned   *bool   `json:"is_pinned,omitempty" example:"true"`
	SortOrder  *int    `json:"sort_order,omitempty" example:"0"`
}

type ResourceLinkPatch struct {
	Kind      *models.LinkKind
	URL       *string
	Title     *string
	TitleSet  bool
	StageID   *uuid.UUID
	StageSet  bool
	IsPinned  *bool
	SortOrder *int
}

type ResourceLinkListResponse struct {
	Items []models.ResourceLink `json:"items"`
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
	Kind      *models.LinkKind
	URL       *string
	Title     *string
	TitleSet  bool
	SortOrder *int
}

type ParticipantLinkListResponse struct {
	Items []models.ParticipantLink `json:"items"`
}

type CreateProfileLinkRequest struct {
	URL   string  `json:"url" example:"https://github.com/ivan"`
	Label *string `json:"label,omitempty" example:"My repositories"`
}

type UpdateProfileLinkRequest struct {
	URL        *string `json:"url,omitempty" example:"https://github.com/ivan"`
	Label      *string `json:"label,omitempty" example:"My repositories"`
	ClearLabel bool    `json:"clear_label,omitempty" example:"false"`
}

type ReorderProfileLinksRequest struct {
	IDs []string `json:"ids" example:"pf_42ej2s5gh7e8"`
}

type ProfileLinkPatch struct {
	URL      *string
	Label    *string
	LabelSet bool
}

type ProfileLinkListResponse struct {
	Items []models.ProfileLink `json:"items"`
}
