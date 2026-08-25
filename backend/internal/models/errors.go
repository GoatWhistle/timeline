package models

import (
	"errors"
	"fmt"
)

// Базовые доменные ошибки. Слой httpx отображает их в коды HTTP,
// поэтому сервисы никогда не возвращают наружу ошибки транспорта или драйвера БД.
var (
	// ErrNotFound — объект не найден либо недоступен вызывающему.
	ErrNotFound = errors.New("не найдено")
	// ErrConflict — нарушение уникальности или конкурирующее изменение.
	ErrConflict = errors.New("конфликт")
	// ErrForbidden — недостаточно прав.
	ErrForbidden = errors.New("доступ запрещён")
	// ErrUnauthorized — отсутствует или недействительна аутентификация.
	ErrUnauthorized = errors.New("не аутентифицирован")
	// ErrValidation — некорректные входные данные.
	ErrValidation = errors.New("ошибка валидации")
	// ErrStateTransition — недопустимый переход состояния.
	ErrStateTransition = errors.New("недопустимый переход состояния")
	// ErrRateLimited — превышено ограничение частоты запросов.
	ErrRateLimited = errors.New("слишком много запросов")
)

// FieldError — ошибка конкретного поля запроса.
type FieldError struct {
	Field   string `json:"field" example:"email"`
	Message string `json:"message" example:"некорректный адрес"`
}

// DomainError — доменная ошибка с кодом, сообщением и деталями по полям.
type DomainError struct {
	Base    error
	Code    string
	Message string
	Fields  []FieldError
}

// Error реализует интерфейс error.
func (e *DomainError) Error() string {
	if e.Message == "" {
		return e.Base.Error()
	}
	return e.Message
}

// Unwrap возвращает базовую ошибку для errors.Is.
func (e *DomainError) Unwrap() error { return e.Base }

// NewValidation создаёт ошибку валидации с перечнем полей.
func NewValidation(message string, fields ...FieldError) *DomainError {
	return &DomainError{Base: ErrValidation, Code: "validation_failed", Message: message, Fields: fields}
}

// NewValidationf создаёт ошибку валидации с форматированным сообщением.
func NewValidationf(format string, args ...any) *DomainError {
	return &DomainError{Base: ErrValidation, Code: "validation_failed", Message: fmt.Sprintf(format, args...)}
}

// NewConflict создаёт ошибку конфликта с прикладным кодом.
func NewConflict(code, message string) *DomainError {
	return &DomainError{Base: ErrConflict, Code: code, Message: message}
}

// NewNotFound создаёт ошибку отсутствия объекта.
func NewNotFound(message string) *DomainError {
	return &DomainError{Base: ErrNotFound, Code: "not_found", Message: message}
}

// NewForbidden создаёт ошибку недостатка прав.
func NewForbidden(message string) *DomainError {
	return &DomainError{Base: ErrForbidden, Code: "forbidden", Message: message}
}

// NewUnauthorized создаёт ошибку аутентификации.
func NewUnauthorized(message string) *DomainError {
	return &DomainError{Base: ErrUnauthorized, Code: "unauthorized", Message: message}
}

// NewStateTransition создаёт ошибку недопустимого перехода состояния.
func NewStateTransition(message string) *DomainError {
	return &DomainError{Base: ErrStateTransition, Code: "invalid_state_transition", Message: message}
}

// NewRateLimited создаёт ошибку превышения частоты запросов.
func NewRateLimited(message string) *DomainError {
	return &DomainError{Base: ErrRateLimited, Code: "rate_limited", Message: message}
}
