// Package middleware содержит сквозные HTTP-обработчики: идентификатор запроса,
// логирование, восстановление после паники, CORS, CSRF, аутентификацию и rate limit.
package middleware

import (
	"context"
	"crypto/subtle"
	"log/slog"
	"net/http"
	"runtime/debug"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// Имена cookie и заголовков, используемых схемой аутентификации раздела 3 ТЗ.
const (
	AccessCookie  = "access_token"
	RefreshCookie = "refresh_token"
	CSRFCookie    = "csrf_token"
	CSRFHeader    = "X-CSRF-Token"
	RequestHeader = "X-Request-Id"
)

type ctxKey string

const userKey ctxKey = "current_user"

// Authenticator проверяет access token и возвращает активного пользователя.
type Authenticator interface {
	Authenticate(ctx context.Context, accessToken string) (*models.User, error)
}

// RequestID проставляет идентификатор запроса и возвращает его клиенту.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(RequestHeader)
		if id == "" {
			id = uuid.NewString()
		}
		w.Header().Set(RequestHeader, id)
		next.ServeHTTP(w, httpx.WithRequestID(r, id))
	})
}

// Recover превращает панику обработчика в ответ 500 без раскрытия деталей.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("паника обработчика",
					"panic", rec,
					"path", r.URL.Path,
					"request_id", httpx.RequestID(r),
					"stack", string(debug.Stack()))
				httpx.JSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: models.ErrorBody{
					Code:      "internal_error",
					Message:   "внутренняя ошибка сервера",
					RequestID: httpx.RequestID(r),
				}})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	n, err := w.ResponseWriter.Write(b)
	w.bytes += n
	return n, err
}

// Logging пишет структурированный лог запроса без секретов и тел сообщений.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w}
		next.ServeHTTP(sw, r)
		if sw.status == 0 {
			sw.status = http.StatusOK
		}
		slog.Info("http",
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.status,
			"bytes", sw.bytes,
			"duration_ms", float64(time.Since(start).Microseconds())/1000,
			"request_id", httpx.RequestID(r),
			"ip", httpx.ClientIP(r))
	})
}

// CORS разрешает только сконфигурированные origins и передачу cookie.
func CORS(origins []string) func(http.Handler) http.Handler {
	allowAll := slices.Contains(origins, "*")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && (allowAll || slices.Contains(origins, origin)) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, "+CSRFHeader+", "+RequestHeader)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Max-Age", "600")
				w.Header().Add("Vary", "Origin")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// CSRF требует совпадения cookie и заголовка для всех изменяющих запросов.
func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if safeMethod(r.Method) {
			next.ServeHTTP(w, r)
			return
		}
		cookie, err := r.Cookie(CSRFCookie)
		if err != nil || cookie.Value == "" {
			httpx.Error(w, r, models.NewForbidden("отсутствует CSRF-токен"))
			return
		}
		header := r.Header.Get(CSRFHeader)
		if header == "" || subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(header)) != 1 {
			httpx.Error(w, r, models.NewForbidden("CSRF-токен не совпадает"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func safeMethod(m string) bool {
	return m == http.MethodGet || m == http.MethodHead || m == http.MethodOptions
}

// Auth проверяет access token из cookie либо заголовка Authorization.
// Неаутентифицированный запрос отклоняется с кодом 401.
func Auth(a Authenticator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := accessToken(r)
			if token == "" {
				httpx.Error(w, r, models.NewUnauthorized("требуется аутентификация"))
				return
			}
			user, err := a.Authenticate(r.Context(), token)
			if err != nil {
				httpx.Error(w, r, err)
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userKey, user)))
		})
	}
}

// AdminOnly пропускает только администраторов.
func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := CurrentUser(r)
		if user == nil {
			httpx.Error(w, r, models.NewUnauthorized("требуется аутентификация"))
			return
		}
		if !user.IsAdmin {
			slog.Warn("отказ в доступе",
				"path", r.URL.Path,
				"user_id", user.ID,
				"request_id", httpx.RequestID(r))
			httpx.Error(w, r, models.NewForbidden("операция доступна только администратору"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func accessToken(r *http.Request) string {
	if c, err := r.Cookie(AccessCookie); err == nil && c.Value != "" {
		return c.Value
	}
	if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
	}
	return ""
}

// CurrentUser возвращает аутентифицированного пользователя запроса.
func CurrentUser(r *http.Request) *models.User {
	if v, ok := r.Context().Value(userKey).(*models.User); ok {
		return v
	}
	return nil
}

// ActorFrom собирает актора сервисного слоя из запроса.
func ActorFrom(r *http.Request) models.Actor {
	actor := models.Actor{RequestID: httpx.RequestID(r)}
	if u := CurrentUser(r); u != nil {
		actor.UserID = u.ID
		actor.IsAdmin = u.IsAdmin
	}
	return actor
}

// Chain применяет middleware в порядке перечисления.
func Chain(h http.Handler, mw ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mw) - 1; i >= 0; i-- {
		h = mw[i](h)
	}
	return h
}
