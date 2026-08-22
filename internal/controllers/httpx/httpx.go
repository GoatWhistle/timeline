// Package httpx содержит общие примитивы транспортного слоя: разбор запроса,
// рендер JSON и отображение доменных ошибок в коды HTTP.
package httpx

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// MaxBodyBytes ограничивает размер тела запроса.
const MaxBodyBytes = 1 << 20

type ctxKey string

const (
	requestIDKey ctxKey = "request_id"
)

// WithRequestID кладёт идентификатор запроса в контекст.
func WithRequestID(r *http.Request, id string) *http.Request {
	return r.WithContext(ContextWithRequestID(r.Context(), id))
}

// RequestID достаёт идентификатор запроса из контекста запроса.
func RequestID(r *http.Request) string {
	if v, ok := r.Context().Value(requestIDKey).(string); ok {
		return v
	}
	return ""
}

// JSON пишет успешный ответ с указанным кодом.
func JSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if body == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("не удалось записать тело ответа", "error", err)
	}
}

// NoContent пишет пустой ответ 204.
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// Decode читает и разбирает тело запроса в структуру.
func Decode(r *http.Request, dst any) error {
	if r.Body == nil {
		return models.NewValidation("пустое тело запроса")
	}
	r.Body = http.MaxBytesReader(nil, r.Body, MaxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		if errors.Is(err, io.EOF) {
			return models.NewValidation("пустое тело запроса")
		}
		return models.NewValidationf("некорректный JSON: %v", err)
	}
	return nil
}

// Error отображает доменную ошибку в ответ API.
func Error(w http.ResponseWriter, r *http.Request, err error) {
	status, body := mapError(err)
	body.Error.RequestID = RequestID(r)

	if status >= http.StatusInternalServerError {
		slog.ErrorContext(r.Context(), "внутренняя ошибка запроса",
			"error", err, "path", r.URL.Path, "method", r.Method, "request_id", body.Error.RequestID)
	} else {
		slog.DebugContext(r.Context(), "ошибка запроса",
			"error", err, "path", r.URL.Path, "method", r.Method, "status", status)
	}
	JSON(w, status, body)
}

func mapError(err error) (int, models.ErrorResponse) {
	var de *models.DomainError
	if errors.As(err, &de) {
		return statusFor(de.Base), models.ErrorResponse{Error: models.ErrorBody{
			Code:    de.Code,
			Message: de.Message,
			Fields:  de.Fields,
		}}
	}

	switch {
	case errors.Is(err, models.ErrNotFound):
		return http.StatusNotFound, simple("not_found", "не найдено")
	case errors.Is(err, models.ErrConflict):
		return http.StatusConflict, simple("conflict", "конфликт состояния")
	case errors.Is(err, models.ErrForbidden):
		return http.StatusForbidden, simple("forbidden", "доступ запрещён")
	case errors.Is(err, models.ErrUnauthorized):
		return http.StatusUnauthorized, simple("unauthorized", "не аутентифицирован")
	case errors.Is(err, models.ErrValidation):
		return http.StatusBadRequest, simple("validation_failed", "некорректные данные запроса")
	case errors.Is(err, models.ErrStateTransition):
		return http.StatusConflict, simple("invalid_state_transition", "недопустимый переход состояния")
	case errors.Is(err, models.ErrRateLimited):
		return http.StatusTooManyRequests, simple("rate_limited", "слишком много запросов")
	}
	return http.StatusInternalServerError, simple("internal_error", "внутренняя ошибка сервера")
}

func statusFor(base error) int {
	switch {
	case errors.Is(base, models.ErrNotFound):
		return http.StatusNotFound
	case errors.Is(base, models.ErrConflict):
		return http.StatusConflict
	case errors.Is(base, models.ErrForbidden):
		return http.StatusForbidden
	case errors.Is(base, models.ErrUnauthorized):
		return http.StatusUnauthorized
	case errors.Is(base, models.ErrValidation):
		return http.StatusBadRequest
	case errors.Is(base, models.ErrStateTransition):
		return http.StatusConflict
	case errors.Is(base, models.ErrRateLimited):
		return http.StatusTooManyRequests
	}
	return http.StatusInternalServerError
}

func simple(code, message string) models.ErrorResponse {
	return models.ErrorResponse{Error: models.ErrorBody{Code: code, Message: message}}
}

// PathUUID читает UUID из параметра пути.
func PathUUID(r *http.Request, name string) (uuid.UUID, error) {
	raw := r.PathValue(name)
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, models.NewValidationf("параметр %s должен быть UUID", name)
	}
	return id, nil
}

// ParsePage читает page и page_size из query с ограничением сверху.
func ParsePage(r *http.Request, def, max int) (models.Page, error) {
	p := models.Page{Number: 1, Size: def}
	if v := r.URL.Query().Get("page"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			return p, models.NewValidation("page должен быть положительным числом")
		}
		p.Number = n
	}
	if v := r.URL.Query().Get("page_size"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			return p, models.NewValidation("page_size должен быть положительным числом")
		}
		if n > max {
			n = max
		}
		p.Size = n
	}
	return p, nil
}

// Meta собирает метаданные страницы по общему количеству записей.
func Meta(p models.Page, total int64) models.PageMeta {
	return models.PageMeta{
		Page:     p.Number,
		PageSize: p.Size,
		Total:    total,
		HasNext:  int64(p.Offset()+p.Size) < total,
	}
}

// QueryBool читает булев параметр query.
func QueryBool(r *http.Request, name string) (bool, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return false, nil
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return false, models.NewValidationf("параметр %s должен быть булевым", name)
	}
	return b, nil
}

// QueryTime читает параметр query в формате RFC 3339.
func QueryTime(r *http.Request, name string) (*time.Time, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, v)
	if err != nil {
		return nil, models.NewValidationf("параметр %s должен быть датой RFC3339", name)
	}
	t = t.UTC()
	return &t, nil
}

// QueryUUID читает необязательный UUID из query.
func QueryUUID(r *http.Request, name string) (*uuid.UUID, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return nil, nil
	}
	id, err := uuid.Parse(v)
	if err != nil {
		return nil, models.NewValidationf("параметр %s должен быть UUID", name)
	}
	return &id, nil
}

// QueryTrimmed читает строковый параметр query без окружающих пробелов.
func QueryTrimmed(r *http.Request, name string) string {
	return strings.TrimSpace(r.URL.Query().Get(name))
}

// ClientIP определяет адрес клиента с учётом X-Forwarded-For.
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if idx := strings.IndexByte(xff, ','); idx > 0 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}
	if r.RemoteAddr == "" {
		return ""
	}
	if idx := strings.LastIndexByte(r.RemoteAddr, ':'); idx > 0 {
		return r.RemoteAddr[:idx]
	}
	return r.RemoteAddr
}
