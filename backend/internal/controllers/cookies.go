package controllers

import (
	"net/http"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type CookieOptions struct {
	Domain string
	Secure bool
}

func (o CookieOptions) base(name, value string, expires time.Time, httpOnly bool) *http.Cookie {
	return &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		Domain:   o.Domain,
		Expires:  expires,
		HttpOnly: httpOnly,
		Secure:   o.Secure,
		SameSite: http.SameSiteLaxMode,
	}
}

func (o CookieOptions) SetAuth(w http.ResponseWriter, pair *models.TokenPair) {
	http.SetCookie(w, o.base(middleware.AccessCookie, pair.AccessToken, pair.AccessExpiresAt, true))
	http.SetCookie(w, o.base(middleware.RefreshCookie, pair.RefreshToken, pair.RefreshExpiresAt, true))
}

func (o CookieOptions) SetCSRF(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, o.base(middleware.CSRFCookie, token, expires, false))
}

func (o CookieOptions) Clear(w http.ResponseWriter) {
	past := time.Unix(0, 0)
	for _, name := range []string{middleware.AccessCookie, middleware.RefreshCookie, middleware.CSRFCookie} {
		c := o.base(name, "", past, name != middleware.CSRFCookie)
		c.MaxAge = -1
		http.SetCookie(w, c)
	}
}
