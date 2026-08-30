package participation

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Controller struct {
	svc     ParticipantService
	pageDef int
	pageMax int
}

func NewController(svc ParticipantService, pageDef, pageMax int) *Controller {
	return &Controller{svc: svc, pageDef: pageDef, pageMax: pageMax}
}

// @Summary	Event participant roster
// @Tags		participants
// @Produce	json
// @Security	CookieAuth
// @Param		id					path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param		team_role			query		string	false	"Filter by participant role"
// @Param		registration_status	query		string	false	"Filter by registration status"	Enums(TODO,DONE,NOT_REQUIRED)
// @Param		include_removed		query		bool	false	"Include participants removed from the roster"
// @Param		search				query		string	false	"Search by name and email"
// @Param		page				query		int		false	"Page number"	default(1)
// @Param		page_size			query		int		false	"Page size"		default(50)
// @Success	200					{object}	dto.ParticipantPage
// @Failure	403					{object}	dto.ErrorResponse
// @Failure	404					{object}	dto.ErrorResponse
// @Router		/admin/events/{id}/participants [get]
func (c *Controller) List(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.svc.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	removed, err := httpx.QueryBool(r, "include_removed")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	filter := models.ParticipantFilter{
		TeamRole:           httpx.QueryTrimmed(r, "team_role"),
		RegistrationStatus: models.RegistrationStatusValue(httpx.QueryTrimmed(r, "registration_status")),
		IncludeRemoved:     removed,
		Search:             httpx.QueryTrimmed(r, "search"),
	}
	items, total, err := c.svc.List(r.Context(), middleware.ActorFrom(r), id, filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.ParticipantPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Update a participant role
// @Description	team_role is a free-text role on the event, not an access permission.
// @Tags			participants
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Participant identifier"	example(pa_42ej2s5gh7e8)
// @Param			request	body		dto.UpdateTeamRoleRequest	true	"New role"
// @Success		200		{object}	dto.ParticipantResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/admin/participants/{id}/team-role [patch]
func (c *Controller) UpdateTeamRole(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindParticipant, c.svc.ResolveParticipantDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.UpdateTeamRoleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	p, err := c.svc.UpdateTeamRole(r.Context(), middleware.ActorFrom(r), id, req.TeamRole)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, p)
}

// @Summary		Reactivate a participant
// @Description	Returns participation to ASSIGNED, increments assignment_version, clears removed_at
// @Description	and sets the role again. An existing registration status is preserved.
// @Tags			participants
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Participant identifier"	example(pa_42ej2s5gh7e8)
// @Param			request	body		dto.UpdateTeamRoleRequest	true	"Participant role"
// @Success		200		{object}	dto.ParticipantResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse	"the participant is already assigned"
// @Router			/admin/participants/{id}/reactivate [post]
func (c *Controller) Reactivate(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindParticipant, c.svc.ResolveParticipantDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.UpdateTeamRoleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	p, err := c.svc.Reactivate(r.Context(), middleware.ActorFrom(r), id, req.TeamRole)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, p)
}
