package models

import (
	"encoding/json"
	"strings"
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

type DisplayKind struct {
	Prefix string
	Entity string
}

var (
	DisplayKindEvent              = DisplayKind{Prefix: "ev", Entity: "event"}
	DisplayKindStage              = DisplayKind{Prefix: "st", Entity: "stage"}
	DisplayKindRegistrationStatus = DisplayKind{Prefix: "rs", Entity: "registration status"}
)

const (
	displayAlphabet  = "23456789abcdefghjkmnpqrstuvwxyz"
	displaySuffixLen = 12
)

type DisplayID struct {
	Kind  DisplayKind
	Value string
}

func (d DisplayID) String() string { return d.Value }

func (d DisplayID) MarshalJSON() ([]byte, error) { return json.Marshal(d.Value) }

func NewDisplayID(kind DisplayKind, value string) DisplayID {
	return DisplayID{Kind: kind, Value: value}
}

func ParseDisplayID(kind DisplayKind, raw string) (DisplayID, error) {
	prefix := kind.Prefix + "_"
	if !strings.HasPrefix(raw, prefix) {
		return DisplayID{}, NewValidationf("%s identifier must start with %q", kind.Entity, prefix)
	}
	suffix := raw[len(prefix):]
	if len(suffix) != displaySuffixLen {
		return DisplayID{}, NewValidationf("%s identifier must be %d characters after %q",
			kind.Entity, displaySuffixLen, prefix)
	}
	for _, r := range suffix {
		if !strings.ContainsRune(displayAlphabet, r) {
			return DisplayID{}, NewValidationf("%s identifier contains the unsupported character %q",
				kind.Entity, string(r))
		}
	}
	return DisplayID{Kind: kind, Value: raw}, nil
}
