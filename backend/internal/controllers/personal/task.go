package personal

import (
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Controller struct {
	personal PersonalService
	limiter  shared.Limiter
	limit    int
	window   time.Duration
	pageDef  int
	pageMax  int
}

func NewController(svc PersonalService, limiter shared.Limiter, limit int,
	window time.Duration, pageDef, pageMax int) *Controller {
	return &Controller{
		personal: svc, limiter: limiter, limit: limit, window: window,
		pageDef: pageDef, pageMax: pageMax,
	}
}

func (c *Controller) allow(r *http.Request, scope string) bool {
	if c.limiter == nil {
		return true
	}
	actor := middleware.ActorFrom(r)
	return c.limiter.Allow(scope+":"+actor.UserID.String(), c.limit, c.window)
}

func (c *Controller) guard(w http.ResponseWriter, r *http.Request, scope string) bool {
	if c.allow(r, scope) {
		return true
	}
	httpx.Error(w, r, models.NewRateLimited("too many personal layer requests"))
	return false
}

// @Summary		Own tasks for an event
// @Description	The personal checklist of the caller for one event. A task belongs to the
// @Description	person who created it: the listing never shows anyone else's tasks, and an
// @Description	administrator has no privilege here either (specification 5.4).
// @Description
// @Description	Personal records are outside the notification and audit domains: a task never
// @Description	becomes a queued notification and never reaches the audit log.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	models.TaskListResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse	"the event is not visible to the caller"
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/events/{id}/tasks [get]
func (c *Controller) ListTasks(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.tasks.list") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindEvent, c.personal.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.personal.ListTasks(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.TaskListResponse{Items: items})
}

// @Summary		Create an own task
// @Description	Adds one task to the caller's personal checklist for the event. The optional
// @Description	stage must belong to the same event.
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Event identifier"
// @Param			request	body		models.CreateTaskRequest	true	"Task"
// @Success		201		{object}	models.ParticipantTask
// @Failure		400		{object}	models.ErrorResponse	"the stage belongs to another event"
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"the task limit for this event is reached"
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/events/{id}/tasks [post]
func (c *Controller) CreateTask(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.tasks.create") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindEvent, c.personal.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CreateTaskRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	task, err := c.personal.CreateTask(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, task)
}

// @Summary		Update an own task
// @Description	Changes one task of the caller. Marking a task done and undone are both plain
// @Description	updates: the transition is reversible and produces neither a notification nor
// @Description	an audit entry. A task of another user answers 404, never 403.
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Task identifier"	format(uuid)
// @Param			request	body		models.UpdateTaskRequest	true	"Fields to change"
// @Success		200		{object}	models.ParticipantTask
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse	"the task belongs to another user"
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/tasks/{id} [patch]
func (c *Controller) UpdateTask(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.tasks.update") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateTaskRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	task, err := c.personal.UpdateTask(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, task)
}

// @Summary		Delete an own task
// @Description	Removes one task of the caller. Personal records may be deleted outright:
// @Description	unlike the administrative layer, they carry no retention obligation.
// @Tags			personal
// @Security		CookieAuth
// @Param			id	path	string	true	"Task identifier"	format(uuid)
// @Success		204	"the task is deleted"
// @Failure		401	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/tasks/{id} [delete]
func (c *Controller) DeleteTask(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.tasks.delete") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.personal.DeleteTask(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}

// @Summary		Checklist templates
// @Description	The built-in checklist templates. A template is a shared reference list, not a
// @Description	personal record: applying one creates the caller's own tasks, and editing a
// @Description	template afterwards does not touch tasks already created.
// @Description
// @Description	Titles are dictionary keys, not finished text: the client renders them in the
// @Description	reader's language.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	models.TemplateListResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/checklist-templates [get]
func (c *Controller) ListTemplates(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.templates.list") {
		return
	}
	items, err := c.personal.ListTemplates(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.TemplateListResponse{Items: items})
}

// @Summary		Apply a checklist template
// @Description	Creates the caller's tasks from a template in one action. Due dates are counted
// @Description	from the event start using the offset of each template item, so a negative
// @Description	offset means "before the start".
// @Description
// @Description	A template item whose title already exists among the caller's tasks for this
// @Description	event is skipped rather than duplicated, and the per-item outcome is reported
// @Description	line by line, so applying the same template twice changes nothing.
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Event identifier"
// @Param			request	body		models.ApplyTemplateRequest	true	"Template to apply"
// @Success		200		{object}	models.BatchResult
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse	"unknown template or invisible event"
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/events/{id}/tasks/apply-template [post]
func (c *Controller) ApplyTemplate(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.templates.apply") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", models.DisplayKindEvent, c.personal.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.ApplyTemplateRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	result, err := c.personal.ApplyTemplate(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, result)
}
