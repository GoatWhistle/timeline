package team

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
)

// @Summary		Put a team member on the event roster
// @Description	Restricted to the team lead. The lineup for an event is drawn from the team's active
// @Description	members and may be smaller than the team. The event's `team_size_max` caps the
// @Description	lineup and a further addition is refused with `roster_full`; `team_size_min` is only
// @Description	the threshold of the derived registered state and never blocks an addition, so an
// @Description	under-filled lineup is allowed while it is being assembled.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id			path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Param			event_id	path		string	true	"Event identifier"	example(ev_gma9hq8a96q5)
// @Param			user_id		path		string	true	"User identifier"	example(us_42ej2s5gh7e8)
// @Success		200			{object}	dto.TeamEventEntryResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse
// @Failure		404			{object}	dto.ErrorResponse
// @Failure		409			{object}	dto.ErrorResponse
// @Router			/teams/{id}/events/{event_id}/roster/{user_id} [put]
func (c *Controller) AddToRoster(w http.ResponseWriter, r *http.Request) {
	id, eventID, userID, ok := c.rosterTarget(w, r)
	if !ok {
		return
	}
	entry, err := c.svc.AddToRoster(r.Context(), middleware.ActorFrom(r), id, eventID, userID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, entry)
}

// @Summary		Take a team member off the event roster
// @Description	Restricted to the team lead. The member stays in the team; only this event's lineup
// @Description	loses them. Their personal registration status on the event is left untouched.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id			path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Param			event_id	path		string	true	"Event identifier"	example(ev_gma9hq8a96q5)
// @Param			user_id		path		string	true	"User identifier"	example(us_42ej2s5gh7e8)
// @Success		200			{object}	dto.TeamEventEntryResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse
// @Failure		404			{object}	dto.ErrorResponse
// @Router			/teams/{id}/events/{event_id}/roster/{user_id} [delete]
func (c *Controller) RemoveFromRoster(w http.ResponseWriter, r *http.Request) {
	id, eventID, userID, ok := c.rosterTarget(w, r)
	if !ok {
		return
	}
	entry, err := c.svc.RemoveFromRoster(r.Context(), middleware.ActorFrom(r), id, eventID, userID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, entry)
}

// @Summary		Mark a roster member as registered
// @Description	Restricted to the team lead, and only for a member on this event's own roster. It
// @Description	writes the same personal registration status the member writes themselves, so the
// @Description	value stays a self-report relayed by the lead rather than a verified fact; the audit
// @Description	log records who marked whom.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id			path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Param			event_id	path		string	true	"Event identifier"	example(ev_gma9hq8a96q5)
// @Param			user_id		path		string	true	"User identifier"	example(us_42ej2s5gh7e8)
// @Success		200			{object}	dto.TeamEventEntryResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		403			{object}	dto.ErrorResponse
// @Failure		404			{object}	dto.ErrorResponse
// @Failure		409			{object}	dto.ErrorResponse
// @Router			/teams/{id}/events/{event_id}/roster/{user_id}/registration/done [post]
func (c *Controller) MarkRosterMember(w http.ResponseWriter, r *http.Request) {
	id, eventID, userID, ok := c.rosterTarget(w, r)
	if !ok {
		return
	}
	entry, err := c.svc.MarkRosterMemberRegistered(r.Context(), middleware.ActorFrom(r),
		id, eventID, userID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, entry)
}
