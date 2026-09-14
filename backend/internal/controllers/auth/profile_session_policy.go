package auth

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/presenter"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Your own idle-session policy
// @Description	How long a session of this account may sit unused before it is signed out on its
// @Description	own. The setting belongs to the account holder alone: it is not a site-wide rule and
// @Description	no administrator sets it for anybody.
// @Description
// @Description	Every account starts at default_days, so a forgotten session does not sit signed in
// @Description	forever by default. idle_days absent means the holder has deliberately turned the
// @Description	sweep off and sessions then live out their refresh lifetime; it is a choice made on
// @Description	purpose, not the state an account is handed.
// @Description
// @Description	min_days, max_days and default_days come from the server, so a client need not carry
// @Description	its own copy of the range or of the value to offer when restoring the default.
// @Tags			profile
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.SessionPolicyResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/me/session-policy [get]
func (c *ProfileController) SessionPolicy(w http.ResponseWriter, r *http.Request) {
	idleDays, err := c.svc.SessionPolicy(r.Context(), middleware.ActorFrom(r).UserID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, presenter.SessionPolicyResponse(idleDays))
}

// @Summary		Set or clear your idle-session policy
// @Description	Stores the number of days a session may stay unused before it is revoked. Sending
// @Description	idle_days null turns the sweep off for this account, which is a deliberate choice
// @Description	rather than a return to the default: sessions then live out their refresh lifetime
// @Description	whether they are used or not. To go back to the default, send default_days.
// @Description
// @Description	A value outside min_days..max_days is refused with 400 and field idle_days, and the
// @Description	stored setting is left as it was. The bound is enforced here and by the database, not
// @Description	by the client.
// @Description
// @Description	The sweep that acts on this setting never revokes the session that is most recently
// @Description	used, so setting a short period cannot sign the account out of the very device that
// @Description	set it. Sessions are revoked, not deleted: the refresh chain ends and the row remains.
// @Tags			profile
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.UpdateSessionPolicyRequest	true	"The idle period to store"
// @Success		200		{object}	dto.SessionPolicyResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Router			/me/session-policy [put]
func (c *ProfileController) UpdateSessionPolicy(w http.ResponseWriter, r *http.Request) {
	var req dto.UpdateSessionPolicyRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	idleDays, err := c.svc.SetSessionPolicy(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, presenter.SessionPolicyResponse(idleDays))
}
