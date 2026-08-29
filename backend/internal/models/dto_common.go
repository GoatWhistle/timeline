package models

import (
	"encoding/json"
	"strings"
	"time"
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
	Index   int    `json:"index" example:"0"`
	Key     string `json:"key,omitempty" example:"pa_42ej2s5gh7e8"`
	ID      string `json:"id,omitempty" example:"pa_42ej2s5gh7e8"`
	Status  string `json:"status" enums:"ok,skipped,error" example:"ok"`
	Code    string `json:"code,omitempty" example:"already_assigned"`
	Message string `json:"message,omitempty" example:"the participant is already assigned"`
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
	DisplayKindParticipant        = DisplayKind{Prefix: "pa", Entity: "participant"}
	DisplayKindUser               = DisplayKind{Prefix: "us", Entity: "user"}
	DisplayKindTask               = DisplayKind{Prefix: "tk", Entity: "task"}
	DisplayKindResourceLink       = DisplayKind{Prefix: "rl", Entity: "resource link"}
	DisplayKindParticipantLink    = DisplayKind{Prefix: "pl", Entity: "personal link"}
	DisplayKindProfileLink        = DisplayKind{Prefix: "pf", Entity: "profile link"}
	DisplayKindSession            = DisplayKind{Prefix: "se", Entity: "session"}
	DisplayKindInvite             = DisplayKind{Prefix: "in", Entity: "invite"}
	DisplayKindArtifact           = DisplayKind{Prefix: "ar", Entity: "artifact"}
	DisplayKindNotificationRule   = DisplayKind{Prefix: "nr", Entity: "notification rule"}
	DisplayKindSystemEvent        = DisplayKind{Prefix: "sy", Entity: "system event"}
	DisplayKindRegistration       = DisplayKind{Prefix: "rg", Entity: "registration"}
	DisplayKindNotification       = DisplayKind{Prefix: "nt", Entity: "notification"}
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
