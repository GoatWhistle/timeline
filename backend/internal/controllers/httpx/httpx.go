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

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const MaxBodyBytes = 1 << 20

type ctxKey string

const (
	requestIDKey ctxKey = "request_id"
)

func WithRequestID(r *http.Request, id string) *http.Request {
	return r.WithContext(ContextWithRequestID(r.Context(), id))
}

func RequestID(r *http.Request) string {
	if v, ok := r.Context().Value(requestIDKey).(string); ok {
		return v
	}
	return ""
}

func JSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if body == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("failed to write response body", "error", err)
	}
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

func Decode(r *http.Request, dst any) error {
	if r.Body == nil {
		return models.NewValidation("empty request body")
	}
	r.Body = http.MaxBytesReader(nil, r.Body, MaxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		if errors.Is(err, io.EOF) {
			return models.NewValidation("empty request body")
		}
		return models.NewValidationf("malformed JSON: %v", err)
	}
	return nil
}

func Error(w http.ResponseWriter, r *http.Request, err error) {
	status, body := mapError(err)
	body.Error.RequestID = RequestID(r)

	if status >= http.StatusInternalServerError {
		slog.ErrorContext(r.Context(), "internal request error",
			"error", err, "path", ScrubPath(r.URL.Path), "method", r.Method, "request_id", body.Error.RequestID)
	} else {
		slog.DebugContext(r.Context(), "request error",
			"error", err, "path", ScrubPath(r.URL.Path), "method", r.Method, "status", status)
	}
	JSON(w, status, body)
}

func mapError(err error) (int, dto.ErrorResponse) {
	var de *models.DomainError
	if errors.As(err, &de) {
		return statusFor(de.Base), dto.ErrorResponse{Error: dto.ErrorBody{
			Code:    de.Code,
			Message: de.Message,
			Fields:  de.Fields,
		}}
	}

	switch {
	case errors.Is(err, models.ErrNotFound):
		return http.StatusNotFound, simple("not_found", "not found")
	case errors.Is(err, models.ErrConflict):
		return http.StatusConflict, simple("conflict", "state conflict")
	case errors.Is(err, models.ErrForbidden):
		return http.StatusForbidden, simple("forbidden", "access denied")
	case errors.Is(err, models.ErrUnauthorized):
		return http.StatusUnauthorized, simple("unauthorized", "not authenticated")
	case errors.Is(err, models.ErrValidation):
		return http.StatusBadRequest, simple("validation_failed", "invalid request data")
	case errors.Is(err, models.ErrStateTransition):
		return http.StatusConflict, simple("invalid_state_transition", "invalid state transition")
	case errors.Is(err, models.ErrRateLimited):
		return http.StatusTooManyRequests, simple("rate_limited", "too many requests")
	}
	return http.StatusInternalServerError, simple("internal_error", "internal server error")
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

func simple(code, message string) dto.ErrorResponse {
	return dto.ErrorResponse{Error: dto.ErrorBody{Code: code, Message: message}}
}

func ParsePage(r *http.Request, def, maxSize int) (models.Page, error) {
	p := models.Page{Number: 1, Size: def}
	if v := r.URL.Query().Get("page"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			return p, models.NewValidation("page must be a positive number")
		}
		p.Number = n
	}
	if v := r.URL.Query().Get("page_size"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			return p, models.NewValidation("page_size must be a positive number")
		}
		if n > maxSize {
			n = maxSize
		}
		p.Size = n
	}
	return p, nil
}

func Meta(p models.Page, total int64) dto.PageMeta {
	return dto.PageMeta{
		Page:     p.Number,
		PageSize: p.Size,
		Total:    total,
		HasNext:  int64(p.Offset()+p.Size) < total,
	}
}

func QueryBool(r *http.Request, name string) (bool, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return false, nil
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return false, models.NewValidationf("parameter %s must be a boolean", name)
	}
	return b, nil
}

func QueryTime(r *http.Request, name string) (*time.Time, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, v)
	if err != nil {
		return nil, models.NewValidationf("parameter %s must be an RFC3339 date", name)
	}
	t = t.UTC()
	return &t, nil
}

func QueryUUID(r *http.Request, name string) (*uuid.UUID, error) {
	v := r.URL.Query().Get(name)
	if v == "" {
		return nil, nil
	}
	id, err := uuid.Parse(v)
	if err != nil {
		return nil, models.NewValidationf("parameter %s must be a UUID", name)
	}
	return &id, nil
}

func QueryTrimmed(r *http.Request, name string) string {
	return strings.TrimSpace(r.URL.Query().Get(name))
}

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
