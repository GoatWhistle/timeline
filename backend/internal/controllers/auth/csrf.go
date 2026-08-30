package auth

import (
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Obtain a CSRF token
// @Description	Issues the token in a cookie and in the response body. Every mutating request must send it in the X-CSRF-Token header.
// @Tags			auth
// @Produce		json
// @Success		200	{object}	dto.CSRFResponse
// @Router			/auth/csrf [get]
func (c *Controller) CSRF(w http.ResponseWriter, r *http.Request) {
	token := randomToken()
	c.cookies.SetCSRF(w, token, time.Now().Add(c.csrfTTL))
	httpx.JSON(w, http.StatusOK, dto.CSRFResponse{CSRFToken: token, HeaderName: middleware.CSRFHeader})
}
