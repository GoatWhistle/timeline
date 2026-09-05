package httpsession

import (
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

const DeviceTTL = 5 * 365 * 24 * time.Hour

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

func (o CookieOptions) SetDevice(w http.ResponseWriter, deviceID string, now time.Time) {
	c := o.base(middleware.DeviceCookie, deviceID, now.Add(DeviceTTL), true)
	c.MaxAge = int(DeviceTTL / time.Second)
	http.SetCookie(w, c)
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
