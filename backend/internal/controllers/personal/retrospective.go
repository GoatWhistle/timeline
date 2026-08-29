package personal

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

// @Summary		Own retrospective for an event
// @Description	Three free-text fields the participant fills in after the event: what went well,
// @Description	what did not, and what to do differently next time. A personal record in every
// @Description	sense of specification 5.4 — only the owner reads it, an administrator has no
// @Description	privilege here, and a foreign record answers 404 rather than 403.
// @Description
// @Description	An absent retrospective is returned as an empty one rather than a 404: the screen
// @Description	that offers to write it must not have to distinguish "nothing yet" from an error.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.ParticipantRetrospective
// @Failure		401	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse	"the event is not visible to the caller"
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/events/{id}/retrospective [get]
func (c *Controller) GetRetrospective(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.retrospective.get") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	item, err := c.personal.GetRetrospective(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

// @Summary		Save an own retrospective
// @Description	Stores the caller's retrospective for the event. Every field is optional on its
// @Description	own, but a retrospective whose three fields are all blank is equivalent to an
// @Description	absent one and deletes the record — the same rule as the note in specification
// @Description	5.4.3, so that a list of events with retrospectives does not fill with blanks.
// @Description
// @Description	The retrospective is a personal record: it never becomes a queued notification
// @Description	and never reaches the audit log. Its reminder arrives as a system event on the
// @Description	bus of specification 9.9, two days after the event ends.
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	format(uuid)
// @Param			request	body		models.SaveRetrospectiveRequest	true	"Retrospective"
// @Success		200		{object}	models.ParticipantRetrospective
// @Failure		400		{object}	models.ErrorResponse	"a field is too long"
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/events/{id}/retrospective [put]
func (c *Controller) SaveRetrospective(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.retrospective.save") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.SaveRetrospectiveRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	item, err := c.personal.SaveRetrospective(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}

// @Summary	Delete an own retrospective
// @Tags		personal
// @Security	CookieAuth
// @Param		id	path	string	true	"Event identifier"	format(uuid)
// @Success	204	"the retrospective is deleted"
// @Failure	401	{object}	models.ErrorResponse
// @Failure	404	{object}	models.ErrorResponse
// @Failure	429	{object}	models.ErrorResponse
// @Router		/me/events/{id}/retrospective [delete]
func (c *Controller) DeleteRetrospective(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.retrospective.delete") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.personal.DeleteRetrospective(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}
