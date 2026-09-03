package event

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (c *Controller) trackID(r *http.Request, name string) (uuid.UUID, error) {
	return httpx.PathDisplayID(r, name, dto.DisplayKindEventTrack, c.tracks.ResolveDisplayID)
}

// @Summary		Event tracks
// @Description	The cases a hackathon is split into, in order, each with its prize places.
// @Description	Only a hackathon carries tracks; a meetup answers with an empty list.
// @Description	The envelope also states the event prize pool, the sum already distributed
// @Description	across every track, and what is left unallocated.
// @Tags			tracks
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.EventTrackListResponse
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/events/{id}/tracks [get]
func (c *Controller) ListTracks(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := c.tracks.List(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// @Summary		Create a track
// @Description	Tracks belong to hackathons only; a meetup is refused with 409 tracks_not_supported.
// @Description	Prize amounts are whole numbers in the event currency. The sum of every prize of
// @Description	every track must not exceed prize_pool, and a request that would break that is
// @Description	refused with 400 without writing anything.
// @Tags			tracks
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Event identifier"
// @Param			request	body		dto.CreateEventTrackRequest	true	"Track payload"
// @Success		201		{object}	dto.EventTrackResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		409		{object}	dto.ErrorResponse
// @Router			/admin/events/{id}/tracks [post]
func (c *Controller) CreateTrack(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.CreateEventTrackRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := c.tracks.Create(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, out)
}

// @Summary		Update a track
// @Description	Prizes are replaced wholesale only when set_prizes is true; otherwise they are
// @Description	left as they are. The pool ceiling is rechecked against every other track.
// @Tags			tracks
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Track identifier"
// @Param			request	body		dto.UpdateEventTrackRequest	true	"Mutable fields"
// @Success		200		{object}	dto.EventTrackResponse
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		403		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Router			/admin/tracks/{id} [patch]
func (c *Controller) UpdateTrack(w http.ResponseWriter, r *http.Request) {
	id, err := c.trackID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.UpdateEventTrackRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	out, err := c.tracks.Update(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// @Summary		Delete a track
// @Description	Teams that had chosen this track keep their entry and lose the choice: the
// @Description	track becomes unset rather than the registration being withdrawn.
// @Tags			tracks
// @Produce		json
// @Security		CookieAuth
// @Param			id	path	string	true	"Track identifier"	example(tr_42ej2s5gh7e8)
// @Success		204	"the track is deleted"
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/admin/tracks/{id} [delete]
func (c *Controller) DeleteTrack(w http.ResponseWriter, r *http.Request) {
	id, err := c.trackID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.tracks.Delete(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}
