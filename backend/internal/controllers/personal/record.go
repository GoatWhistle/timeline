package personal

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

// @Summary		Own note for an event
// @Description	The caller's private Markdown note for one event. A missing note is answered
// @Description	with an empty body rather than 404, so the editor opens on a blank page.
// @Description
// @Description	The server stores and returns the Markdown source and never renders it to HTML;
// @Description	rendering belongs to the client. Nobody else can read this note, an
// @Description	administrator included.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.ParticipantNote
// @Failure		401	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse	"the event is not visible to the caller"
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/events/{id}/note [get]
func (c *Controller) GetNote(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.note.get") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	note, err := c.personal.GetNote(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, note)
}

// @Summary		Save an own note
// @Description	Stores the caller's note for the event; the endpoint suits autosave. Saving an
// @Description	empty body deletes the record instead of keeping a blank one, so a list of
// @Description	events carrying notes never fills with empty entries.
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string					true	"Event identifier"	format(uuid)
// @Param			request	body		models.SaveNoteRequest	true	"Markdown source"
// @Success		200		{object}	models.ParticipantNote
// @Failure		400		{object}	models.ErrorResponse	"the note is too long"
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/events/{id}/note [put]
func (c *Controller) SaveNote(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.note.save") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.SaveNoteRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	note, err := c.personal.SaveNote(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, note)
}

// @Summary		Own submission artifacts
// @Description	What the caller says they submitted for the event: repository, video, slides,
// @Description	demo stand or submission page.
// @Description
// @Description	The submitted mark is the participant's own word, exactly like the registration
// @Description	status of specification 1: the system never checks an external site, so nothing
// @Description	here is a verified fact.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	format(uuid)
// @Success		200	{object}	models.ArtifactListResponse
// @Failure		401	{object}	models.ErrorResponse
// @Failure		404	{object}	models.ErrorResponse
// @Failure		429	{object}	models.ErrorResponse
// @Router			/me/events/{id}/artifacts [get]
func (c *Controller) ListArtifacts(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.artifacts.list") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, err := c.personal.ListArtifacts(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.ArtifactListResponse{Items: items})
}

// @Summary		Add an own artifact
// @Description	Records one artifact of the caller for the event. The link is only checked for
// @Description	being a parseable address; schemes that execute in a browser are rejected.
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Event identifier"	format(uuid)
// @Param			request	body		models.CreateArtifactRequest	true	"Artifact"
// @Success		201		{object}	models.ParticipantArtifact
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse
// @Failure		409		{object}	models.ErrorResponse	"the artifact limit for this event is reached"
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/events/{id}/artifacts [post]
func (c *Controller) CreateArtifact(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.artifacts.create") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.CreateArtifactRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	artifact, err := c.personal.CreateArtifact(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, artifact)
}

// @Summary		Update an own artifact
// @Description	Changes one artifact of the caller, including the self-reported submitted mark.
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string							true	"Artifact id"	format(uuid)
// @Param			request	body		models.UpdateArtifactRequest	true	"Fields to change"
// @Success		200		{object}	models.ParticipantArtifact
// @Failure		400		{object}	models.ErrorResponse
// @Failure		401		{object}	models.ErrorResponse
// @Failure		404		{object}	models.ErrorResponse	"the artifact belongs to another user"
// @Failure		429		{object}	models.ErrorResponse
// @Router			/me/artifacts/{id} [patch]
func (c *Controller) UpdateArtifact(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.artifacts.update") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req models.UpdateArtifactRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	artifact, err := c.personal.UpdateArtifact(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, artifact)
}

// @Summary	Delete an own artifact
// @Tags		personal
// @Security	CookieAuth
// @Param		id	path	string	true	"Artifact identifier"	format(uuid)
// @Success	204	"the artifact is deleted"
// @Failure	401	{object}	models.ErrorResponse
// @Failure	404	{object}	models.ErrorResponse
// @Failure	429	{object}	models.ErrorResponse
// @Router		/me/artifacts/{id} [delete]
func (c *Controller) DeleteArtifact(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.artifacts.delete") {
		return
	}
	id, err := httpx.PathUUID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.personal.DeleteArtifact(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}
