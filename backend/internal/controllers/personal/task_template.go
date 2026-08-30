package personal

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

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
// @Success		200	{object}	dto.TemplateListResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		429	{object}	dto.ErrorResponse
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
	httpx.JSON(w, http.StatusOK, dto.TemplateListResponse{Items: items})
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
// @Param			request	body		dto.ApplyTemplateRequest	true	"Template to apply"
// @Success		200		{object}	dto.BatchResult
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse	"unknown template or invisible event"
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/me/events/{id}/tasks/apply-template [post]
func (c *Controller) ApplyTemplate(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.templates.apply") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.personal.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.ApplyTemplateRequest
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
