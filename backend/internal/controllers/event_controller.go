package controllers

import (
	"net/http"
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

type EventController struct {
	events  EventService
	stages  StageService
	pageDef int
	pageMax int
}

func NewEventController(h EventService, s StageService, pageDef, pageMax int) *EventController {
	return &EventController{events: h, stages: s, pageDef: pageDef, pageMax: pageMax}
}

// @Summary		Event list
// @Description	Administrative list with every state, search and filters.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			search				query		string	false	"Search by title and organiser"
// @Param			state				query		string	false	"Comma-separated state filter"	Enums(UNPUBLISHED,UPCOMING,ACTIVE,FINISHED,ARCHIVED)
// @Param			include_archived	query		bool	false	"Include archived records"
// @Param			page				query		int		false	"Page number"	default(1)
// @Param			page_size			query		int		false	"Page size"		default(50)
// @Success		200					{object}	models.EventPage
// @Failure		403					{object}	models.ErrorResponse
// @Router			/admin/events [get]
func (c *EventController) List(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	archived, err := httpx.QueryBool(r, "include_archived")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	filter := models.EventFilter{
		Search:          httpx.QueryTrimmed(r, "search"),
		States:          parseStates(httpx.QueryTrimmed(r, "state")),
		IncludeArchived: archived,
	}
	items, total, err := c.events.List(r.Context(), middleware.ActorFrom(r), filter, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	now := time.Now().UTC()
	out := make([]models.EventResponse, 0, len(items))
	for i := range items {
		out = append(out, eventResponse(&items[i], now, true))
	}
	httpx.JSON(w, http.StatusOK, models.EventPage{Items: out, Meta: httpx.Meta(page, total)})
}

func parseStates(raw string) []models.EventState {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	states := make([]models.EventState, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(strings.ToUpper(p)); p != "" {
			states = append(states, models.EventState(p))
		}
	}
	return states
}

// @Summary		Create an event
// @Description	The event is created unpublished; end_at must be later than start_at.
// @Tags			events
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		models.CreateEventRequest	true	"Event payload"
// @Success		201		{object}	models.EventResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Router			/admin/events [post]
func (c *EventController) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateEventRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.events.Create(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, eventResponse(h, time.Now().UTC(), true))
}

// @Summary		The whole event
// @Description	Administrative read, including notes.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.EventResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Router			/admin/events/{id} [get]
func (c *EventController) Get(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.events.Get(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, eventResponse(h, time.Now().UTC(), true))
}

// @Summary		Update an event
// @Description	Changing end_at increments the registration schedule_version, cancels stale
// @Description	pending notifications and triggers reconciliation. Violating the condition
// @Description	deadline_at <= end_at is rejected.
// @Tags			events
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Event identifier"	format(uuid)
// @Param			request	body		models.UpdateEventRequest	true	"Mutable fields"
// @Success		200		{object}	models.EventResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"the registration deadline falls outside end_at"
// @Router			/admin/events/{id} [patch]
func (c *EventController) Update(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateEventRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.events.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, eventResponse(h, time.Now().UTC(), true))
}

// @Summary		Publish an event
// @Description	The event becomes visible to participants and the scheduler; deferred primary
// @Description	notifications are created by reconciliation.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.EventResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Failure		409	{object}	models.ErrorResponse	"the event is already published or archived"
// @Router			/admin/events/{id}/publish [post]
func (c *EventController) Publish(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.events.Publish(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, eventResponse(h, time.Now().UTC(), true))
}

// @Summary		Archive an event
// @Description	Terminal state in the MVP: pending notifications are cancelled and no new ones are created.
// @Tags			events
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.EventResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Failure		409	{object}	models.ErrorResponse	"event is already archived"
// @Router			/admin/events/{id}/archive [post]
func (c *EventController) Archive(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	h, err := c.events.Archive(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, eventResponse(h, time.Now().UTC(), true))
}

// @Summary		Event stages
// @Description	Available to an assigned participant for a published event, and to an administrator always.
// @Tags			stages
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{array}		models.StageResponse
// @Failure		403	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Router			/events/{id}/stages [get]
func (c *EventController) ListStages(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, event, err := c.stages.List(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out := make([]models.StageResponse, 0, len(items))
	for i := range items {
		out = append(out, stageResponse(&items[i], event))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// @Summary		Create a stage
// @Description	Overlapping stages and stages outside the event period are allowed. A stage produces no notifications.
// @Tags			stages
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Event identifier"	format(uuid)
// @Param			request	body		models.CreateStageRequest	true	"Stage payload"
// @Success		201		{object}	models.StageResponse
// @Failure		400		{object}	models.ErrorResponse
// @Failure		403		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Router			/admin/events/{id}/stages [post]
func (c *EventController) CreateStage(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CreateStageRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	s, event, err := c.stages.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, stageResponse(s, event))
}

// @Summary	Update a stage
// @Tags		stages
// @Accept		json
// @Produce	json
// @Security	CookieAuth
// @Param		id		path		string						true	"Stage identifier"	format(uuid)
// @Param		request	body		models.UpdateStageRequest	true	"Mutable fields"
// @Success	200		{object}	models.StageResponse
// @Failure	400		{object}	models.ErrorResponse
// @Failure	403		{object}	models.ErrorResponse
// @Failure	404		{object}	models.ErrorResponse
// @Router		/admin/stages/{id} [patch]
func (c *EventController) UpdateStage(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateStageRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	s, event, err := c.stages.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, stageResponse(s, event))
}

// @Summary	Delete a stage
// @Tags		stages
// @Produce	json
// @Security	CookieAuth
// @Param		id	path	string	true	"Stage identifier"	format(uuid)
// @Success	204	"the stage is deleted"
// @Failure	403	{object}	models.ErrorResponse
// @Failure	404	{object}	models.ErrorResponse
// @Router		/admin/stages/{id} [delete]
func (c *EventController) DeleteStage(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.stages.Delete(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}
