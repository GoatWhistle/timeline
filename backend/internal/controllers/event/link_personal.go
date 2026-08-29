package event

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

// @Summary		Own links for an event
// @Description	The caller's private links for one event, kept in a table of their own rather
// @Description	than mixed into the event links. Separate storage keeps the permission check
// @Description	simple: an event link is administrative, a personal link belongs to whoever
// @Description	created it, and no query has to tell the two apart at read time.
// @Description
// @Description	Nobody else can read these links, an administrator included.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	models.ParticipantLinkListResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse	"the event is not visible to the caller"
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/events/{id}/links [get]
func (c *ResourceLinkController) ListPersonal(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "links.personal.list") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindEvent, c.links.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.links.ListPersonal(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.ParticipantLinkListResponse{Items: items})
}

// @Summary		Add an own link
// @Description	Saves a private link of the caller for one event. The address is validated the
// @Description	same way as everywhere else: it must parse, and schemes that execute in the
// @Description	browser are rejected. HTTPS is not required.
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string								true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			request	body		models.CreateParticipantLinkRequest	true	"Link"
// @Success		201		{object}	models.ParticipantLink
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"the personal link limit for the event is reached"
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/events/{id}/links [post]
func (c *ResourceLinkController) CreatePersonal(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "links.personal.create") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindEvent, c.links.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CreateParticipantLinkRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	link, err := c.links.CreatePersonal(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, link)
}

// @Summary		Change an own link
// @Description	Edits one of the caller's private links. Somebody else's link answers 404: its
// @Description	existence is not disclosed (specification 5.4).
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string								true	"Link identifier"	example(pl_42ej2s5gh7e8)
// @Param			request	body		models.UpdateParticipantLinkRequest	true	"Fields to change"
// @Success		200		{object}	models.ParticipantLink
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/links/{id} [patch]
func (c *ResourceLinkController) UpdatePersonal(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "links.personal.update") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindParticipantLink,
		c.links.ResolvePersonalLinkDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateParticipantLinkRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	link, err := c.links.UpdatePersonal(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, link)
}

// @Summary		Remove an own link
// @Description	Deletes one of the caller's private links. Personal records stay outside the
// @Description	audit log, so the removal is not recorded there.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Link identifier"	example(pl_42ej2s5gh7e8)
// @Success		204	"the link is removed"
// @Failure		401	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/links/{id} [delete]
func (c *ResourceLinkController) DeletePersonal(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "links.personal.delete") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindParticipantLink,
		c.links.ResolvePersonalLinkDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.links.DeletePersonal(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
