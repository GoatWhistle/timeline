package controllers

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type RegistrationController struct {
	registrations RegistrationService
	pageDef       int
	pageMax       int
}

func NewRegistrationController(reg RegistrationService, pageDef, pageMax int) *RegistrationController {
	return &RegistrationController{registrations: reg, pageDef: pageDef, pageMax: pageMax}
}

type RegistrationService interface {
	Get(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.Registration, error)
	Create(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.CreateRegistrationRequest,
	) (*models.Registration, error)
	Update(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, req models.UpdateRegistrationRequest,
	) (*models.Registration, error)
	SetState(
		ctx context.Context, actor models.Actor, eventID uuid.UUID, state models.RegistrationState,
	) (*models.Registration, error)
}

// @Summary	Event registration
// @Tags		registration
// @Produce	json
// @Security	CookieAuth
// @Param		id	path		string	true	"Event identifier"	format(uuid)
// @Success	200	{object}	models.RegistrationResponse
// @Failure	403	{object}	models.ErrorResponse
// @Failure	404	{object}	models.ErrorResponse
// @Router		/admin/events/{id}/registration [get]
func (c *RegistrationController) Get(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	reg, err := c.registrations.Get(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, registrationResponse(reg))
}

// @Summary		Create a registration
// @Description	Creating an active registration creates missing TODO statuses for every assigned
// @Description	participant. Primary notifications are created only for a published, non-archived
// @Description	event; otherwise they are deferred until publication. The deadline must satisfy
// @Description	the condition deadline_at <= event.end_at.
// @Tags			registration
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string								true	"Event identifier"	format(uuid)
// @Param			request	body		models.CreateRegistrationRequest	true	"Link and deadline"
// @Success		201		{object}	models.RegistrationResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"registration already exists or the deadline falls outside end_at"
// @Router			/admin/events/{id}/registration [post]
func (c *RegistrationController) Create(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CreateRegistrationRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	reg, err := c.registrations.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, registrationResponse(reg))
}

// @Summary		Update a registration
// @Description	Changing the link increments notification_content_version; changing the deadline increments
// @Description	schedule_version. In both cases pending notifications are cancelled and current ones
// @Description	are created by reconciliation with a new logical key.
// @Tags			registration
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string								true	"Event identifier"	format(uuid)
// @Param			request	body		models.UpdateRegistrationRequest	true	"Mutable fields"
// @Success		200		{object}	models.RegistrationResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse
// @Router			/admin/events/{id}/registration [patch]
func (c *RegistrationController) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateRegistrationRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	reg, err := c.registrations.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, registrationResponse(reg))
}

// @Summary		Enable registration
// @Description	Increments activation_version and schedule_version and creates missing statuses;
// @Description	participants in TODO receive the primary notification again.
// @Tags			registration
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.RegistrationResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Failure		409	{object}	models.ErrorResponse	"registration is already active"
// @Router			/admin/events/{id}/registration/enable [post]
func (c *RegistrationController) Enable(w http.ResponseWriter, r *http.Request) {
	c.setState(w, r, models.RegistrationActive)
}

// @Summary		Disable registration
// @Description	Pending notifications are cancelled; statuses are preserved but stop being actionable.
// @Tags			registration
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.RegistrationResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Failure		409	{object}	models.ErrorResponse	"registration is already disabled"
// @Router			/admin/events/{id}/registration/disable [post]
func (c *RegistrationController) Disable(w http.ResponseWriter, r *http.Request) {
	c.setState(w, r, models.RegistrationDisabled)
}

func (c *RegistrationController) setState(w http.ResponseWriter, r *http.Request, state models.RegistrationState) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	reg, err := c.registrations.SetState(r.Context(), middleware.ActorFrom(r), id, state)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, registrationResponse(reg))
}
