package event

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/shared"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Event stages
// @Description	Available to an assigned participant for a published event, and to an administrator always.
// @Tags			stages
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{array}		dto.StageResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/events/{id}/stages [get]
func (c *Controller) ListStages(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, event, err := c.stages.List(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out := make([]dto.StageResponse, 0, len(items))
	for i := range items {
		out = append(out, shared.StageResponse(&items[i], event))
	}
	httpx.JSON(w, http.StatusOK, out)
}

// @Summary		Create a stage
// @Description	Overlapping stages and stages outside the event period are allowed.
// @Description	A stage produces no notifications.
// @Tags			stages
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string					true	"Event identifier"
// @Param			request	body		dto.CreateStageRequest	true	"Stage payload"
// @Success		201		{object}	dto.StageResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/admin/events/{id}/stages [post]
func (c *Controller) CreateStage(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.CreateStageRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	s, event, err := c.stages.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, shared.StageResponse(s, event))
}

// @Summary	Update a stage
// @Tags		stages
// @Accept		json
// @Produce	json
// @Security	CookieAuth
// @Param		id		path		string					true	"Stage identifier"
// @Param		request	body		dto.UpdateStageRequest	true	"Mutable fields"
// @Success	200		{object}	dto.StageResponse
// @Failure	400		{object}	dto.ErrorResponse
// @Failure	403		{object}	dto.ErrorResponse
// @Failure	404		{object}	dto.ErrorResponse
// @Router		/admin/stages/{id} [patch]
func (c *Controller) UpdateStage(w http.ResponseWriter, r *http.Request) {
	id, err := c.stageID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.UpdateStageRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	s, event, err := c.stages.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, shared.StageResponse(s, event))
}

// @Summary	Delete a stage
// @Tags		stages
// @Produce	json
// @Security	CookieAuth
// @Param		id	path	string	true	"Stage identifier"	example(st_42ej2s5gh7)
// @Success	204	"the stage is deleted"
// @Failure	403	{object}	dto.ErrorResponse
// @Failure	404	{object}	dto.ErrorResponse
// @Router		/admin/stages/{id} [delete]
func (c *Controller) DeleteStage(w http.ResponseWriter, r *http.Request) {
	id, err := c.stageID(r, "id")
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
