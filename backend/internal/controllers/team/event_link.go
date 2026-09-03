package team

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		The team's own links for one hackathon
// @Description	Links the team keeps beside its entry into one hackathon: the repository, the
// @Description	board, the deployed demo. They belong to the team, not to a person, and only
// @Description	the team can read them. Somebody outside the team gets 404 for the entry, so
// @Description	no list discloses that a rival team even entered.
// @Description
// @Description	The kind of a link is not stored: the client derives the service from the
// @Description	address, exactly as it does for profile links, so a new service needs no
// @Description	migration. `can_write` says whether the caller may change the list: an active
// @Description	member may, somebody still holding an unaccepted invitation may not.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id			path		string	true	"Team"
// @Param			event_id	path		string	true	"Event"
// @Success		200			{object}	dto.TeamEventLinkListResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		404			{object}	dto.ErrorResponse	"the team or its entry is not visible to the caller"
// @Router			/teams/{id}/events/{event_id}/links [get]
func (c *Controller) ListEventLinks(w http.ResponseWriter, r *http.Request) {
	id, eventID, ok := c.teamEventIDs(w, r)
	if !ok {
		return
	}
	items, err := c.svc.ListEventLinks(r.Context(), middleware.ActorFrom(r), id, eventID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

// @Summary		Add a team link to a hackathon
// @Description	Appends a link to the end of the team's list for this entry. Any active member
// @Description	may add one, the lead included; an invitation that has not been accepted grants
// @Description	no write. The address must parse and use http or https, so a scheme that
// @Description	executes in the browser or hands the address to an operating system handler is
// @Description	rejected. HTTPS is not required. The number of links per entry is bounded.
// @Tags			teams
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id			path		string							true	"Team"
// @Param			event_id	path		string							true	"Event"
// @Param			request		body		dto.CreateTeamEventLinkRequest	true	"Link"
// @Success		201			{object}	models.TeamEventLink
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse	"the caller is not an active member"
// @Failure		404			{object}	dto.ErrorResponse
// @Failure		409			{object}	dto.ErrorResponse	"the link limit for this entry is reached"
// @Router			/teams/{id}/events/{event_id}/links [post]
func (c *Controller) AddEventLink(w http.ResponseWriter, r *http.Request) {
	id, eventID, ok := c.teamEventIDs(w, r)
	if !ok {
		return
	}
	var req dto.CreateTeamEventLinkRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	link, err := c.svc.AddEventLink(r.Context(), middleware.ActorFrom(r), id, eventID, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, link)
}

// @Summary		Change a team link
// @Description	Edits one link of the team. A link of a team the caller does not belong to
// @Description	answers 404: its existence is not disclosed.
// @Tags			teams
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Link"	example(tl_42ej2s5gh7e8)
// @Param			request	body		dto.UpdateTeamEventLinkRequest	true	"Changes"
// @Success		200		{object}	models.TeamEventLink
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/team-links/{id} [patch]
func (c *Controller) UpdateEventLink(w http.ResponseWriter, r *http.Request) {
	id, ok := c.linkID(w, r)
	if !ok {
		return
	}
	var req dto.UpdateTeamEventLinkRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	link, err := c.svc.UpdateEventLink(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, link)
}

// @Summary		Remove a team link
// @Description	Deletes one link of the team. Any active member may remove any of them: the
// @Description	list belongs to the team rather than to whoever added a row.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Link"	example(tl_42ej2s5gh7e8)
// @Success		204	"the link is removed"
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/team-links/{id} [delete]
func (c *Controller) RemoveEventLink(w http.ResponseWriter, r *http.Request) {
	id, ok := c.linkID(w, r)
	if !ok {
		return
	}
	if err := c.svc.RemoveEventLink(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// @Summary		Reorder the team links of a hackathon
// @Description	Replaces the display order. Every link of the entry must be listed exactly
// @Description	once, so a stale client cannot silently drop a row somebody else added.
// @Tags			teams
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id			path		string								true	"Team"
// @Param			event_id	path		string								true	"Event"
// @Param			request		body		dto.ReorderTeamEventLinksRequest	true	"Wanted order"
// @Success		200			{object}	dto.TeamEventLinkListResponse
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse
// @Failure		404			{object}	dto.ErrorResponse
// @Router			/teams/{id}/events/{event_id}/links/order [put]
func (c *Controller) ReorderEventLinks(w http.ResponseWriter, r *http.Request) {
	id, eventID, ok := c.teamEventIDs(w, r)
	if !ok {
		return
	}
	var req dto.ReorderTeamEventLinksRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	ids, err := httpx.BodyDisplayIDs(r.Context(), req.IDs, dto.DisplayKindTeamEventLink,
		c.svc.ResolveTeamEventLinkDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.svc.ReorderEventLinks(r.Context(), middleware.ActorFrom(r), id, eventID, ids)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (c *Controller) linkID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindTeamEventLink,
		c.svc.ResolveTeamEventLinkDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return uuid.Nil, false
	}
	return id, true
}
