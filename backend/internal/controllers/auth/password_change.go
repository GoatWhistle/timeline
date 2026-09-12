package auth

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Change your own password
// @Description	Requires the current password. Revokes every other session; this device stays signed in.
// @Description	A notice is sent to every channel linked to the account.
// @Tags			auth
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.ChangePasswordRequest	true	"Current and new password"
// @Success		200		{object}	dto.MessageResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Router			/auth/password/change [post]
func (c *Controller) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var req dto.ChangePasswordRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.svc.ChangePassword(r.Context(), middleware.ActorFrom(r), req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.MessageResponse{Message: "password changed"})
}
