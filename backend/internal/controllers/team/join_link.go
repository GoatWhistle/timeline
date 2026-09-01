package team

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
)

// @Summary		The team's join link
// @Description	Restricted to the team lead. It reports whether a link is active and when it expires;
// @Description	the token itself is issued once, at rotation, and is never returned again or written
// @Description	to the log.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Success		200	{object}	dto.TeamJoinLinkResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/teams/{id}/join-link [get]
func (c *Controller) JoinLink(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	link, err := c.svc.JoinLink(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, link)
}

// @Summary		Issue or rotate the join link
// @Description	Restricted to the team lead. A team holds at most one usable link: rotating revokes
// @Description	the previous one, so a leaked address stops working the moment a new one is issued.
// @Description	The token is returned exactly once in this response and only its hash is stored.
// @Description	Anyone signed in who opens the link joins the team as an active member immediately.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Success		201	{object}	dto.TeamJoinLinkSecretResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/teams/{id}/join-link [post]
func (c *Controller) RotateJoinLink(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	link, err := c.svc.RotateJoinLink(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, link)
}

// @Summary		Revoke the join link
// @Description	Restricted to the team lead. The address stops working at once and the team is left
// @Description	without a link until the lead issues a new one.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Success		204
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/teams/{id}/join-link [delete]
func (c *Controller) RevokeJoinLink(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	if err := c.svc.RevokeJoinLink(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}

// @Summary		Join a team through its link
// @Description	Any signed-in account that holds the token joins the team as an active member. A
// @Description	revoked, expired or unknown token answers 404 with the same body, so the address
// @Description	discloses nothing about the team behind it.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			token	path		string	true	"Join token"
// @Success		200		{object}	dto.TeamDetailResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse
// @Router			/team-join/{token} [post]
func (c *Controller) JoinByLink(w http.ResponseWriter, r *http.Request) {
	detail, err := c.svc.JoinByLink(r.Context(), middleware.ActorFrom(r), r.PathValue("token"))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, detail)
}
