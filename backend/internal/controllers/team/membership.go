package team

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Invite a user into the team
// @Description	Restricted to the team lead. The person is named by exactly one of `user_id`, `nickname`
// @Description	and `email`, and must already have an account: a platform invitation to somebody who is
// @Description	not registered yet is an administrator operation, so an address nobody uses answers 404
// @Description	with the same body an unknown nickname gets. The invitation lands in the INVITED state
// @Description	and the invited person accepts it themselves.
// @Tags			teams
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Param			request	body		dto.InviteTeamMemberRequest	true	"Person to invite, named one way"
// @Success		200		{object}	dto.TeamDetailResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse
// @Router			/teams/{id}/invitations [post]
func (c *Controller) Invite(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	var req dto.InviteTeamMemberRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	detail, err := c.svc.Invite(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, detail)
}

// @Summary		Accept an invitation
// @Description	The invited user turns their own INVITED membership into ACTIVE. Accepting twice
// @Description	is not an error.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Success		200	{object}	dto.TeamDetailResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/teams/{id}/membership [post]
func (c *Controller) Accept(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	detail, err := c.svc.Accept(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, detail)
}

// @Summary		Leave a team
// @Description	The caller leaves the team themselves. The team lead cannot leave their own team.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Success		204
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Failure		409	{object}	dto.ErrorResponse
// @Router			/teams/{id}/membership [delete]
func (c *Controller) Leave(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	if err := c.svc.Leave(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}

// @Summary		Remove a member from the team
// @Description	Restricted to the team lead. The lead cannot remove themselves.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Param			user_id	path		string	true	"User identifier"	example(us_42ej2s5gh7e8)
// @Success		200		{object}	dto.TeamDetailResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse
// @Router			/teams/{id}/members/{user_id} [delete]
func (c *Controller) Remove(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	userID, err := httpx.PathDisplayID(r, "user_id", dto.DisplayKindUser, c.svc.ResolveUserDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	detail, err := c.svc.Remove(r.Context(), middleware.ActorFrom(r), id, userID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, detail)
}
