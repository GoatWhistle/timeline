package event

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/presenter"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type RetentionService interface {
	GetSettings(ctx context.Context, actor models.Actor) (*models.RetentionSettings, error)
	UpdateSettings(ctx context.Context, actor models.Actor,
		req dto.UpdateRetentionSettingsRequest) (*models.RetentionSettings, error)
	CancelPurge(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
	ToResponse(ctx context.Context, settings *models.RetentionSettings) dto.RetentionSettingsResponse
}

type RetentionController struct {
	retention RetentionService
	events    EventService
}

func NewRetentionController(retention RetentionService, events EventService) *RetentionController {
	return &RetentionController{retention: retention, events: events}
}

func (c *RetentionController) eventID(r *http.Request, name string) (uuid.UUID, error) {
	return httpx.PathDisplayID(r, name, dto.DisplayKindEvent, c.events.ResolveDisplayID)
}

// @Summary		Storage retention settings
// @Description	Admin-configured policy for automatic event archiving and deletion: how many days
// @Description	after an event ends it is archived automatically, whether the archive is kept forever
// @Description	or purged after a number of months, whether the cover is dropped when an event is
// @Description	archived, and how long the audit log is retained.
// @Tags			retention
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	dto.RetentionSettingsResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Router			/admin/retention-settings [get]
func (c *RetentionController) Get(w http.ResponseWriter, r *http.Request) {
	settings, err := c.retention.GetSettings(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, c.retention.ToResponse(r.Context(), settings))
}

// @Summary		Update storage retention settings
// @Description	Setting archive_after_days or delete_archive_after_months to null disables that
// @Description	automatic step; an event is never deleted immediately, only marked with a future
// @Description	purge_scheduled_at that the admin can still cancel per event before it is reached.
// @Tags			retention
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			request	body		dto.UpdateRetentionSettingsRequest	true	"Retention policy"
// @Success		200		{object}	dto.RetentionSettingsResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Router			/admin/retention-settings [patch]
func (c *RetentionController) Update(w http.ResponseWriter, r *http.Request) {
	var req dto.UpdateRetentionSettingsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	settings, err := c.retention.UpdateSettings(r.Context(), middleware.ActorFrom(r), req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, c.retention.ToResponse(r.Context(), settings))
}

// @Summary		Cancel a scheduled deletion
// @Description	Clears purge_scheduled_at on an archived event, keeping it archived indefinitely.
// @Description	Available only while the scheduled date has not yet been reached.
// @Tags			retention
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.EventResponse
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse	"no deletion is scheduled for this event"
// @Router			/admin/events/{id}/purge-cancel [post]
func (c *RetentionController) CancelPurge(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	updated, err := c.retention.CancelPurge(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, presenter.EventResponse(updated, time.Now().UTC(), true))
}
