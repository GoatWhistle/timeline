package controllers

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/httpx"
	"github.com/kaifarikman/hackathon-os-backend/internal/controllers/middleware"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type RegistrationController struct {
	registrations RegistrationService
	statuses      StatusService
	rules         RuleService
	pageDef       int
	pageMax       int
}

func NewRegistrationController(reg RegistrationService, st StatusService, rules RuleService, pageDef, pageMax int) *RegistrationController {
	return &RegistrationController{registrations: reg, statuses: st, rules: rules, pageDef: pageDef, pageMax: pageMax}
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

// @Summary	Participant registration statuses
// @Tags		registration
// @Produce	json
// @Security	CookieAuth
// @Param		id			path		string	true	"Event identifier"	format(uuid)
// @Param		page		query		int		false	"Page number"		default(1)
// @Param		page_size	query		int		false	"Page size"		default(50)
// @Success	200			{object}	models.RegistrationStatusPage
// @Failure	403			{object}	models.ErrorResponse
// @Failure	404			{object}	models.ErrorResponse
// @Router		/admin/events/{id}/registration-statuses [get]
func (c *RegistrationController) ListStatuses(w http.ResponseWriter, r *http.Request) {
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
	items, total, err := c.statuses.List(r.Context(), middleware.ActorFrom(r), id, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.RegistrationStatusPage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Mark registration as completed
// @Description	Participant self-report: moves their own TODO status to DONE. Available with an active
// @Description	registration, an assigned participation and a non-archived event. The system does not verify the external site.
// @Tags			registration
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.RegistrationStatusResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Failure		409	{object}	models.ErrorResponse	"invalid state transition"
// @Router			/events/{id}/registration/done [post]
func (c *RegistrationController) MarkDone(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	st, err := c.statuses.MarkDone(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, st)
}

// @Summary		Administrative status transition
// @Description	Allowed transitions: TODO to DONE, DONE to TODO, TODO/DONE to NOT_REQUIRED,
// @Description	NOT_REQUIRED to TODO. Entering TODO increments todo_cycle and clears registered_at.
// @Tags			registration
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Status identifier"	format(uuid)
// @Param			request	body		models.AdminChangeStatusRequest	true	"New status"
// @Success		200		{object}	models.RegistrationStatusResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse
// @Router			/admin/registration-statuses/{id} [patch]
func (c *RegistrationController) AdminChangeStatus(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.AdminChangeStatusRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	st, err := c.statuses.AdminChange(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, st)
}

// @Summary		Bulk status assignment
// @Description	Only TODO and NOT_REQUIRED are accepted. The result is returned per participant.
// @Tags			registration
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	format(uuid)
// @Param			request	body		models.BatchSetStatusRequest	true	"Participants and target status"
// @Success		200		{object}	models.BatchResult
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Router			/admin/events/{id}/registration-statuses/batch-set [post]
func (c *RegistrationController) BatchSetStatus(w http.ResponseWriter, r *http.Request) {
	id, req, ok := c.batchInput(w, r)
	if !ok {
		return
	}
	res, err := c.statuses.BatchSet(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

// @Summary		Preview a bulk status assignment
// @Description	Returns the number of records to be changed and skipped without modifying data.
// @Tags			registration
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	format(uuid)
// @Param			request	body		models.BatchSetStatusRequest	true	"Participants and target status"
// @Success		200		{object}	models.PreviewResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Router			/admin/events/{id}/registration-statuses/batch-set/preview [post]
func (c *RegistrationController) BatchSetStatusPreview(w http.ResponseWriter, r *http.Request) {
	id, req, ok := c.batchInput(w, r)
	if !ok {
		return
	}
	res, err := c.statuses.BatchSetPreview(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}

func (c *RegistrationController) batchInput(w http.ResponseWriter, r *http.Request) (id uuid.UUID, req models.BatchSetStatusRequest, ok bool) {
	parsed, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return id, req, false
	}
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return id, req, false
	}
	return parsed, req, true
}

// @Summary	Reminder rules
// @Tags		rules
// @Produce	json
// @Security	CookieAuth
// @Param		id	path		string	true	"Event identifier"	format(uuid)
// @Success	200	{array}		models.NotificationRuleResponse
// @Failure	403	{object}	models.ErrorResponse
// @Failure	404	{object}	models.ErrorResponse
// @Router		/admin/events/{id}/registration/rules [get]
func (c *RegistrationController) ListRules(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.rules.List(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out := make([]models.NotificationRuleResponse, 0, len(items))
	for i := range items {
		out = append(out, ruleResponse(&items[i]))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// @Summary		Create a reminder rule
// @Description	The sign of offset_minutes selects the type: a positive value is a reminder before the deadline,
// @Description	zero fires at the deadline, and a negative value is an overdue notification.
// @Description	A registration accepts at most 10 rules.
// @Tags			rules
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Event identifier"	format(uuid)
// @Param			request	body		models.CreateRuleRequest	true	"Rule parameters"
// @Success		201		{object}	models.NotificationRuleResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"a rule with this offset already exists or the slot limit is reached"
// @Router			/admin/events/{id}/registration/rules [post]
func (c *RegistrationController) CreateRule(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CreateRuleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	rule, err := c.rules.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, ruleResponse(rule))
}

// @Summary		Update a reminder rule
// @Description	Changing schedule fields increments schedule_version once per transaction
// @Description	and triggers notification reconciliation.
// @Tags			rules
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Rule identifier"	format(uuid)
// @Param			request	body		models.UpdateRuleRequest	true	"Mutable fields"
// @Success		200		{object}	models.NotificationRuleResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse
// @Router			/admin/registration-rules/{id} [patch]
func (c *RegistrationController) UpdateRule(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateRuleRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	rule, err := c.rules.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, ruleResponse(rule))
}

// @Summary		Disable a reminder rule
// @Description	The rule is set to enabled=false; the row is preserved so that the occupied slot
// @Description	and offset stay reserved.
// @Tags			rules
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Rule identifier"	format(uuid)
// @Success		204	"the rule is disabled"
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Router			/admin/registration-rules/{id} [delete]
func (c *RegistrationController) DisableRule(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.rules.Disable(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}
