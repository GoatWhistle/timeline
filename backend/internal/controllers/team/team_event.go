package team

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Enter a hackathon as a team
// @Description	Restricted to the team lead. Only a published, non-archived event of kind HACKATHON
// @Description	accepts a team entry. The entry starts with an empty roster: the lead then draws a
// @Description	lineup for this event from the team's active members, and the team's size limits
// @Description	apply to that lineup, not to the whole team. Entering registers nobody: registration
// @Description	stays the self-report of each member and the system never checks the external site.
// @Description	A track may be chosen here when the hackathon declares any; the choice is optional
// @Description	and can be changed until the event starts.
// @Tags			teams
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string					true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Param			request	body		dto.EnterEventRequest	true	"Event to enter"
// @Success		201		{object}	dto.TeamEventEntryResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse
// @Router			/teams/{id}/events [post]
func (c *Controller) EnterEvent(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	var req dto.EnterEventRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	eventID, err := httpx.BodyDisplayID(r.Context(), &req.EventID, dto.DisplayKindEvent,
		c.svc.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	entry, err := c.svc.EnterEvent(r.Context(), middleware.ActorFrom(r), id, *eventID, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, entry)
}

// @Summary		Events a team entered
// @Description	Every entry the team holds, each with its own roster and derived standing.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Success		200	{object}	dto.TeamEventEntryListResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/teams/{id}/events [get]
func (c *Controller) ListEvents(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	items, err := c.svc.ListEvents(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

// @Summary		Team standing on an event
// @Description	`registered` is derived, never stored: the team counts as registered once the number
// @Description	of roster members who reported their own registration reaches the event's
// @Description	`team_size_min`. Team members outside this event's roster do not count towards it.
// @Description	An event without `team_size_min` has no threshold and is never derived registered.
// @Description	Every count is a self-report, not a verified fact.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id			path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Param			event_id	path		string	true	"Event identifier"	example(ev_gma9hq8a96q5)
// @Success		200			{object}	dto.TeamEventEntryResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		404			{object}	dto.ErrorResponse
// @Router			/teams/{id}/events/{event_id} [get]
func (c *Controller) EventStanding(w http.ResponseWriter, r *http.Request) {
	id, eventID, ok := c.teamEventIDs(w, r)
	if !ok {
		return
	}
	entry, err := c.svc.EventStanding(r.Context(), middleware.ActorFrom(r), id, eventID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, entry)
}

func (c *Controller) teamEventIDs(w http.ResponseWriter, r *http.Request) (uuid.UUID, uuid.UUID, bool) {
	id, ok := c.teamID(w, r)
	if !ok {
		return uuid.Nil, uuid.Nil, false
	}
	eventID, err := httpx.PathDisplayID(r, "event_id", dto.DisplayKindEvent, c.svc.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return uuid.Nil, uuid.Nil, false
	}
	return id, eventID, true
}

func (c *Controller) rosterTarget(w http.ResponseWriter, r *http.Request,
) (uuid.UUID, uuid.UUID, uuid.UUID, bool) {
	id, eventID, ok := c.teamEventIDs(w, r)
	if !ok {
		return uuid.Nil, uuid.Nil, uuid.Nil, false
	}
	userID, err := httpx.PathDisplayID(r, "user_id", dto.DisplayKindUser, c.svc.ResolveUserDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return uuid.Nil, uuid.Nil, uuid.Nil, false
	}
	return id, eventID, userID, true
}

// @Summary		Choose the team's track
// @Description	Restricted to the team lead. The choice is optional: an empty track_id clears it.
// @Description	It can be changed until the event starts; afterwards the request is refused with
// @Description	409 invalid_state_transition and nothing is written. Deleting a track leaves every
// @Description	entry that had chosen it in place, with the choice unset.
// @Tags			teams
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id			path		string					true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Param			event_id	path		string					true	"Event identifier"	example(ev_gma9hq8a96q5)
// @Param			request		body		dto.ChooseTrackRequest	true	"Track to compete in"
// @Success		200			{object}	dto.TeamEventEntryResponse
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse
// @Failure		404			{object}	dto.ErrorResponse
// @Failure		409			{object}	dto.ErrorResponse
// @Router			/teams/{id}/events/{event_id}/track [put]
func (c *Controller) ChooseTrack(w http.ResponseWriter, r *http.Request) {
	teamID, eventID, ok := c.teamEventIDs(w, r)
	if !ok {
		return
	}
	var req dto.ChooseTrackRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	entry, err := c.svc.ChooseTrack(r.Context(), middleware.ActorFrom(r), teamID, eventID, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, entry)
}
