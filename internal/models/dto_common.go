package models

import (
	"time"

	"github.com/google/uuid"
)

// ErrorBody — тело ошибки API, единое для всех endpoint.
type ErrorBody struct {
	Code      string       `json:"code" example:"validation_failed"`
	Message   string       `json:"message" example:"некорректные данные запроса"`
	Fields    []FieldError `json:"fields,omitempty"`
	RequestID string       `json:"request_id" example:"01HZY0Q2K7"`
}

// ErrorResponse — стандартная обёртка ошибки.
type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

// MessageResponse — простой ответ об успешном выполнении операции.
type MessageResponse struct {
	Message string `json:"message" example:"операция выполнена"`
}

// PageMeta — метаданные страницы для всех списочных ответов.
type PageMeta struct {
	Page     int   `json:"page" example:"1"`
	PageSize int   `json:"page_size" example:"50"`
	Total    int64 `json:"total" example:"137"`
	HasNext  bool  `json:"has_next" example:"true"`
}

// BatchItemResult — результат обработки одного элемента пакетной операции.
type BatchItemResult struct {
	Index   int        `json:"index" example:"0"`
	Key     string     `json:"key,omitempty" example:"3f1c1e6e-0b0e-4a2b-9c1a-7d1f1f5a1c11"`
	ID      *uuid.UUID `json:"id,omitempty"`
	Status  string     `json:"status" enums:"ok,skipped,error" example:"ok"`
	Code    string     `json:"code,omitempty" example:"already_assigned"`
	Message string     `json:"message,omitempty" example:"участник уже назначен"`
}

// BatchResult — результат пакетной операции с построчными статусами.
// Каждый элемент обрабатывается собственной транзакцией (раздел 12 ТЗ).
type BatchResult struct {
	Succeeded int               `json:"succeeded" example:"2"`
	Skipped   int               `json:"skipped" example:"1"`
	Failed    int               `json:"failed" example:"0"`
	Results   []BatchItemResult `json:"results"`
}

// PreviewResponse — предварительный подсчёт изменений массовой операции.
type PreviewResponse struct {
	Affected int `json:"affected" example:"12"`
	Skipped  int `json:"skipped" example:"3"`
}

// TimeRange — интервал времени в UTC.
type TimeRange struct {
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}
