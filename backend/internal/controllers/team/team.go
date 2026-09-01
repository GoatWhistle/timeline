package team

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Controller struct {
	svc TeamService
}

func NewController(svc TeamService) *Controller { return &Controller{svc: svc} }

// @Summary		Own teams
// @Description	Teams the caller leads or belongs to, including the ones they were invited into
// @Description	and have not accepted yet. A team the caller left is not listed.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.TeamListResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Router			/teams [get]
func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	items, err := c.svc.List(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

// @Summary		Create a team
// @Description	The caller becomes the team lead and its first active member.
// @Tags			teams
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.CreateTeamRequest	true	"Team name"
// @Success		201		{object}	dto.TeamDetailResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse
// @Router			/teams [post]
func (c *Controller) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateTeamRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	created, err := c.svc.Create(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, created)
}

// @Summary		Team and its members
// @Description	Visible to the members of the team alone. A team the caller does not belong to
// @Description	answers 404: the existence of somebody else's team is not disclosed.
// @Tags			teams
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Success		200	{object}	dto.TeamDetailResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/teams/{id} [get]
func (c *Controller) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	detail, err := c.svc.Get(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, detail)
}

// @Summary		Rename a team
// @Description	Restricted to the team lead. A member who is not the lead receives 403.
// @Tags			teams
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string					true	"Team identifier"	example(tm_42ej2s5gh7e8)
// @Param			request	body		dto.RenameTeamRequest	true	"New name"
// @Success		200		{object}	dto.TeamDetailResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/teams/{id} [patch]
func (c *Controller) Rename(w http.ResponseWriter, r *http.Request) {
	id, ok := c.teamID(w, r)
	if !ok {
		return
	}
	var req dto.RenameTeamRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	detail, err := c.svc.Rename(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, detail)
}

func (c *Controller) teamID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindTeam, c.svc.ResolveTeamDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return uuid.Nil, false
	}
	return id, true
}
