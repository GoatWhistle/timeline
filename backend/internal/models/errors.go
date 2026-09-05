package models

import (
	"errors"
	"fmt"
)

var (
	ErrNotFound        = errors.New("not found")
	ErrConflict        = errors.New("conflict")
	ErrForbidden       = errors.New("access denied")
	ErrUnauthorized    = errors.New("not authenticated")
	ErrValidation      = errors.New("validation error")
	ErrStateTransition = errors.New("invalid state transition")
	ErrRateLimited     = errors.New("too many requests")
)

const (
	FieldCodeRequired       = "required"
	FieldCodeEndBeforeStart = "end_before_start"
	FieldCodeInvalidFormat  = "invalid_format"
	FieldCodeOutOfRange     = "out_of_range"
)

type FieldError struct {
	Field   string `json:"field" example:"email"`
	Code    string `json:"code,omitempty" example:"required"`
	Message string `json:"message" example:"invalid address"`
}

type DomainError struct {
	Base    error
	Code    string
	Message string
	Fields  []FieldError
}

func (e *DomainError) Error() string {
	if e.Message == "" {
		return e.Base.Error()
	}
	return e.Message
}

func (e *DomainError) Unwrap() error { return e.Base }

func NewValidation(message string, fields ...FieldError) *DomainError {
	return &DomainError{Base: ErrValidation, Code: "validation_failed", Message: message, Fields: fields}
}

func NewValidationf(format string, args ...any) *DomainError {
	return &DomainError{Base: ErrValidation, Code: "validation_failed", Message: fmt.Sprintf(format, args...)}
}

func NewConflict(code, message string) *DomainError {
	return &DomainError{Base: ErrConflict, Code: code, Message: message}
}

func NewConflictField(code, message string, fields ...FieldError) *DomainError {
	return &DomainError{Base: ErrConflict, Code: code, Message: message, Fields: fields}
}

func NewNotFound(message string) *DomainError {
	return &DomainError{Base: ErrNotFound, Code: "not_found", Message: message}
}

func NewForbidden(message string) *DomainError {
	return &DomainError{Base: ErrForbidden, Code: "forbidden", Message: message}
}

func NewUnauthorized(message string) *DomainError {
	return &DomainError{Base: ErrUnauthorized, Code: "unauthorized", Message: message}
}

func NewStateTransition(message string) *DomainError {
	return &DomainError{Base: ErrStateTransition, Code: "invalid_state_transition", Message: message}
}

func NewRateLimited(message string) *DomainError {
	return &DomainError{Base: ErrRateLimited, Code: "rate_limited", Message: message}
}
