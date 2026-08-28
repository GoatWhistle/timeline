package controllers

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type ParticipantController struct {
	svc     ParticipantService
	pageDef int
	pageMax int
}

func NewParticipantController(svc ParticipantService, pageDef, pageMax int) *ParticipantController {
	return &ParticipantController{svc: svc, pageDef: pageDef, pageMax: pageMax}
}

// @Summary	Event participant roster
// @Tags		participants
// @Produce	json
// @Security	CookieAuth
// @Param		id					path		string	true	"Event identifier"	format(uuid)
// @Param		team_role			query		string	false	"Filter by participant role"
// @Param		registration_status	query		string	false	"Filter by registration status"	Enums(TODO,DONE,NOT_REQUIRED)
// @Param		include_removed		query		bool	false	"Include participants removed from the roster"
// @Param		search				query		string	false	"Search by name and email"
// @Param		page				query		int		false	"Page number"	default(1)
// @Param		page_size			query		int		false	"Page size"		default(50)
// @Success	200					{object}	models.ParticipantPage
// @Failure	403					{object}	models.ErrorResponse
// @Failure	404					{object}	models.ErrorResponse
// @Router		/admin/events/{id}/participants [get]
func (c *ParticipantController) List(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
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
	httpx.JSON(w, http.StatusOK, models.ParticipantPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Bulk participant assignment
// @Description	Re-adding a previously removed participant reactivates the record and increments
// @Description	assignment_version. The assignment, registration status, primary notification and audit
// @Description	entry run in a single transaction per participant; the result is returned per entry.
// @Tags			participants
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	format(uuid)
// @Param			request	body		models.AddParticipantsRequest	true	"List of users and their roles"
// @Success		200		{object}	models.BatchResult
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Router			/admin/events/{id}/participants/batch-add [post]
func (c *ParticipantController) AddMany(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.AddParticipantsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	res, err := c.svc.AddMany(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// @Summary		Bulk participant removal
// @Description	Moves participation to REMOVED and cancels pending notifications. Sent ones are preserved.
// @Tags			participants
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string								true	"Event identifier"	format(uuid)
// @Param			request	body		models.RemoveParticipantsRequest	true	"Participant identifiers"
// @Success		200		{object}	models.BatchResult
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Router			/admin/events/{id}/participants/batch-remove [post]
func (c *ParticipantController) RemoveMany(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.RemoveParticipantsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	res, err := c.svc.RemoveMany(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// @Summary		Copy the roster from another event
// @Description	Only assigned participants are copied. The participant role is copied as a value
// @Description	by default and can be overridden. Existing participants are skipped
// @Description	and returned as separate result entries.
// @Tags			participants
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Target event identifier"	format(uuid)
// @Param			request	body		models.CopyParticipantsRequest	true	"Source and role overrides"
// @Success		200		{object}	models.BatchResult
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Router			/admin/events/{id}/participants/copy-from [post]
func (c *ParticipantController) CopyFrom(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CopyParticipantsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	res, err := c.svc.CopyFrom(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// @Summary		Update a participant role
// @Description	team_role is a free-text role on the event, not an access permission.
// @Tags			participants
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Participant identifier"	format(uuid)
// @Param			request	body		models.UpdateTeamRoleRequest	true	"New role"
// @Success		200		{object}	models.ParticipantResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Router			/admin/participants/{id}/team-role [patch]
func (c *ParticipantController) UpdateTeamRole(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateTeamRoleRequest
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
// @Param			id		path		string							true	"Participant identifier"	format(uuid)
// @Param			request	body		models.UpdateTeamRoleRequest	true	"Participant role"
// @Success		200		{object}	models.ParticipantResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"the participant is already assigned"
// @Router			/admin/participants/{id}/reactivate [post]
func (c *ParticipantController) Reactivate(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateTeamRoleRequest
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
