package participation

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Bulk participant removal
// @Description	Moves participation to REMOVED and cancels pending notifications. Sent ones are preserved.
// @Tags			participants
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	example(ev_3k7d8gb9be)
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
	participantIDs := httpx.BodyDisplayIDsPerRow(r.Context(), req.ParticipantIDs,
		dto.DisplayKindParticipant, c.svc.ResolveParticipantDisplayID)
	res, err := c.svc.RemoveMany(r.Context(), middleware.ActorFrom(r), id, req, participantIDs)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, res)
}
