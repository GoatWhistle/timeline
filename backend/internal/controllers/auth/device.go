package auth

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

func deviceID(r *http.Request) string {
	cookie, err := r.Cookie(middleware.DeviceCookie)
	if err != nil || !models.ValidDeviceID(cookie.Value) {
		return randomHex(models.DeviceIDLength / 2)
	}
	return cookie.Value
}

func randomToken() string { return randomHex(32) }

func randomHex(size int) string {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		panic("failed to obtain random data: " + err.Error())
	}
	return hex.EncodeToString(buf)
}
