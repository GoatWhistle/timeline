package participation

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Bulk participant assignment
// @Description	Re-adding a previously removed participant reactivates the record and increments
// @Description	assignment_version. The assignment, registration status, primary notification and audit
// @Description	entry run in a single transaction per participant; the result is returned per entry.
// @Tags			participants
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			request	body		dto.AddParticipantsRequest	true	"List of users and their roles"
// @Success		200		{object}	dto.BatchResult
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/admin/events/{id}/participants/batch-add [post]
func (c *Controller) AddMany(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.svc.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.AddParticipantsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	raw := make([]string, 0, len(req.Items))
	for _, item := range req.Items {
		raw = append(raw, item.UserID)
	}
	userIDs, err := httpx.BodyDisplayIDs(r.Context(), raw, dto.DisplayKindUser, c.svc.ResolveUserDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	res, err := c.svc.AddMany(r.Context(), middleware.ActorFrom(r), id, req, userIDs)
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
// @Param			id		path		string								true	"Event identifier"	example(ev_3k7d8gb9be)
// @Param			request	body		dto.RemoveParticipantsRequest	true	"Participant identifiers"
// @Success		200		{object}	dto.BatchResult
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/admin/events/{id}/participants/batch-remove [post]
func (c *Controller) RemoveMany(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.svc.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.RemoveParticipantsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	participantIDs, err := httpx.BodyDisplayIDs(r.Context(), req.ParticipantIDs,
		dto.DisplayKindParticipant, c.svc.ResolveParticipantDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	res, err := c.svc.RemoveMany(r.Context(), middleware.ActorFrom(r), id, req, participantIDs)
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
// @Param			id		path		string							true	"Target event identifier"	example(ev_3k7d8gb9be)
// @Param			request	body		dto.CopyParticipantsRequest	true	"Source and role overrides"
// @Success		200		{object}	dto.BatchResult
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/admin/events/{id}/participants/copy-from [post]
func (c *Controller) CopyFrom(w http.ResponseWriter, r *http.Request) {
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.svc.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.CopyParticipantsRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	sourceEventID, err := httpx.BodyDisplayID(r.Context(), &req.SourceEventID,
		dto.DisplayKindEvent, c.svc.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	raw := make([]string, 0, len(req.Overrides))
	for _, o := range req.Overrides {
		raw = append(raw, o.UserID)
	}
	overrideUserIDs, err := httpx.BodyDisplayIDs(r.Context(), raw,
		dto.DisplayKindUser, c.svc.ResolveUserDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	res, err := c.svc.CopyFrom(r.Context(), middleware.ActorFrom(r), id, req, *sourceEventID, overrideUserIDs)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}
