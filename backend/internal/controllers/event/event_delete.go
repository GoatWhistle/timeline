package event

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
)

// @Summary		Delete an event
// @Description	Removes the event together with its stages, participants and stored covers.
// @Description	An event that already produced notifications cannot be removed: archive it instead.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		204
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Failure		409	{object}	dto.ErrorResponse	"the event is referenced by notifications"
// @Router			/admin/events/{id} [delete]
func (c *Controller) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.events.Delete(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
