package models

import (
	"time"

	"github.com/google/uuid"
)

type ErrorBody struct {
	Code      string       `json:"code" example:"validation_failed"`
	Message   string       `json:"message" example:"invalid request data"`
	Fields    []FieldError `json:"fields,omitempty"`
	RequestID string       `json:"request_id" example:"01HZY0Q2K7"`
}

type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

type MessageResponse struct {
	Message string `json:"message" example:"operation completed"`
}

type PageMeta struct {
	Page     int   `json:"page" example:"1"`
	PageSize int   `json:"page_size" example:"50"`
	Total    int64 `json:"total" example:"137"`
	HasNext  bool  `json:"has_next" example:"true"`
}

type BatchItemResult struct {
	Index   int        `json:"index" example:"0"`
	Key     string     `json:"key,omitempty" example:"3f1c1e6e-0b0e-4a2b-9c1a-7d1f1f5a1c11"`
	ID      *uuid.UUID `json:"id,omitempty"`
	Status  string     `json:"status" enums:"ok,skipped,error" example:"ok"`
	Code    string     `json:"code,omitempty" example:"already_assigned"`
	Message string     `json:"message,omitempty" example:"the participant is already assigned"`
}

type BatchResult struct {
	Succeeded int               `json:"succeeded" example:"2"`
	Skipped   int               `json:"skipped" example:"1"`
	Failed    int               `json:"failed" example:"0"`
	Results   []BatchItemResult `json:"results"`
}

type PreviewResponse struct {
	Affected int `json:"affected" example:"12"`
	Skipped  int `json:"skipped" example:"3"`
}

type TimeRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}
