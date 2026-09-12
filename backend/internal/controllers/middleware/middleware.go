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

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const (
	AccessCookie  = "access_token"
	RefreshCookie = "refresh_token"
	CSRFCookie    = "csrf_token"
	DeviceCookie  = "device_id"
	CSRFHeader    = "X-CSRF-Token"
	RequestHeader = "X-Request-Id"
)

type ctxKey string

const (
	userKey    ctxKey = "current_user"
	sessionKey ctxKey = "current_session"
)

type Authenticator interface {
	Authenticate(ctx context.Context, accessToken string) (*models.User, uuid.UUID, error)
}

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

func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("handler panic",
					"panic", rec,
					"path", httpx.ScrubPath(r.URL.Path),
					"request_id", httpx.RequestID(r),
					"stack", string(debug.Stack()))
				httpx.JSON(w, http.StatusInternalServerError, dto.ErrorResponse{Error: dto.ErrorBody{
					Code:      "internal_error",
					Message:   "internal server error",
					RequestID: httpx.RequestID(r),
				}})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

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
			"path", httpx.ScrubPath(r.URL.Path),
			"status", sw.status,
			"bytes", sw.bytes,
			"duration_ms", float64(time.Since(start).Microseconds())/1000,
			"request_id", httpx.RequestID(r),
			"ip", httpx.ClientIP(r))
	})
}

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

func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if safeMethod(r.Method) || r.URL.Path == "/api/v1/telegram/webhook" {
			next.ServeHTTP(w, r)
			return
		}
		cookie, err := r.Cookie(CSRFCookie)
		if err != nil || cookie.Value == "" {
			httpx.Error(w, r, models.NewForbidden("CSRF token is missing"))
			return
		}
		header := r.Header.Get(CSRFHeader)
		if header == "" || subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(header)) != 1 {
			httpx.Error(w, r, models.NewForbidden("CSRF token mismatch"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func safeMethod(m string) bool {
	return m == http.MethodGet || m == http.MethodHead || m == http.MethodOptions
}

func Auth(a Authenticator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := accessToken(r)
			if token == "" {
				httpx.Error(w, r, models.NewUnauthorized("authentication is required"))
				return
			}
			user, sessionID, err := a.Authenticate(r.Context(), token)
			if err != nil {
				httpx.Error(w, r, err)
				return
			}
			ctx := context.WithValue(r.Context(), userKey, user)
			ctx = context.WithValue(ctx, sessionKey, sessionID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalAuth(a Authenticator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := accessToken(r)
			if token == "" {
				next.ServeHTTP(w, r)
				return
			}
			user, sessionID, err := a.Authenticate(r.Context(), token)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}
			ctx := context.WithValue(r.Context(), userKey, user)
			ctx = context.WithValue(ctx, sessionKey, sessionID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := CurrentUser(r)
		if user == nil {
			httpx.Error(w, r, models.NewUnauthorized("authentication is required"))
			return
		}
		if !user.IsAdmin {
			slog.Warn("access denied",
				"path", httpx.ScrubPath(r.URL.Path),
				"user_id", user.ID,
				"request_id", httpx.RequestID(r))
			httpx.Error(w, r, models.NewForbidden("the operation is restricted to administrators"))
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

func CurrentUser(r *http.Request) *models.User {
	if v, ok := r.Context().Value(userKey).(*models.User); ok {
		return v
	}
	return nil
}

func CurrentSession(r *http.Request) uuid.UUID {
	if v, ok := r.Context().Value(sessionKey).(uuid.UUID); ok {
		return v
	}
	return uuid.Nil
}

func ActorFrom(r *http.Request) models.Actor {
	actor := models.Actor{RequestID: httpx.RequestID(r)}
	if u := CurrentUser(r); u != nil {
		actor.UserID = u.ID
		actor.IsAdmin = u.IsAdmin
		actor.SessionID = CurrentSession(r)
	}
	return actor
}

func Chain(h http.Handler, mw ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mw) - 1; i >= 0; i-- {
		h = mw[i](h)
	}
	return h
}
