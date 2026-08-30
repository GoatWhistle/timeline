package personal

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Own outcome for an event
// @Description	The caller's self-reported result: how it went, and optionally a place, a prize,
// @Description	a track and a note. The outcome is the participant's own account, not a verified
// @Description	standing.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	models.ParticipantOutcome
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse	"no outcome recorded yet"
// @Failure		429	{object}	dto.ErrorResponse
// @Router			/me/events/{id}/outcome [get]
func (c *Controller) GetOutcome(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.outcome.get") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.personal.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	outcome, err := c.personal.GetOutcome(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, outcome)
}

// @Summary		Record an own outcome
// @Description	Stores the caller's result for the event. The default is PARTICIPATED, and that
// @Description	is a complete outcome rather than an empty one: most events end without a prize,
// @Description	and a tracker that can only record wins makes the ordinary case look like a
// @Description	failure.
// @Description
// @Description	A place may accompany only SHORTLISTED, WINNER or PRIZE — "first place" alongside
// @Description	"took part" would contradict itself.
// @Tags			personal
// @Accept			json
// @Produce		json
// @Security		CookieAuth
// @Param			id		path		string						true	"Event identifier"
// @Param			request	body		dto.SaveOutcomeRequest	true	"Outcome"
// @Success		200		{object}	models.ParticipantOutcome
// @Failure		400		{object}	dto.ErrorResponse	"a place requires a placing outcome"
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		404		{object}	dto.ErrorResponse
// @Failure		429		{object}	dto.ErrorResponse
// @Router			/me/events/{id}/outcome [put]
func (c *Controller) SaveOutcome(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.outcome.save") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.personal.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	var req dto.SaveOutcomeRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	outcome, err := c.personal.SaveOutcome(r.Context(), middleware.ActorFrom(r), id, req)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, outcome)
}

// @Summary	Delete an own outcome
// @Tags		personal
// @Security	CookieAuth
// @Param		id	path	string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success	204	"the outcome is deleted"
// @Failure	401	{object}	dto.ErrorResponse
// @Failure	404	{object}	dto.ErrorResponse
// @Failure	429	{object}	dto.ErrorResponse
// @Router		/me/events/{id}/outcome [delete]
func (c *Controller) DeleteOutcome(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.outcome.delete") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.personal.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.personal.DeleteOutcome(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}

// @Summary		Bookmark an event
// @Description	Marks a catalog event as interesting without joining it. A bookmark is not
// @Description	participation: it creates no assignment, no registration status and no
// @Description	notifications, and an administrator does not see it.
// @Description
// @Description	Bookmarking twice is not an error — the operation is idempotent.
// @Tags			personal
// @Security		CookieAuth
// @Param			id	path	string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		204	"the event is bookmarked"
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse	"the event is not in the catalog"
// @Failure		429	{object}	dto.ErrorResponse
// @Router			/me/bookmarks/{id} [put]
func (c *Controller) AddBookmark(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.bookmarks.add") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.personal.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.personal.AddBookmark(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}

// @Summary	Remove a bookmark
// @Tags		personal
// @Security	CookieAuth
// @Param		id	path	string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success	204	"the bookmark is removed"
// @Failure	401	{object}	dto.ErrorResponse
// @Failure	404	{object}	dto.ErrorResponse
// @Failure	429	{object}	dto.ErrorResponse
// @Router		/me/bookmarks/{id} [delete]
func (c *Controller) RemoveBookmark(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.bookmarks.remove") {
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.personal.ResolveEventDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if err := c.personal.RemoveBookmark(r.Context(), middleware.ActorFrom(r), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.NoContent(w)
}

// @Summary		Own bookmarks
// @Description	Events the caller saved for later, newest first. The payload matches the catalog
// @Description	entry, so the same card renders in both places.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Param			page		query		int	false	"Page number"	default(1)
// @Param			page_size	query		int	false	"Page size"		default(50)
// @Success		200			{object}	dto.BookmarkListResponse
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		429			{object}	dto.ErrorResponse
// @Router			/me/bookmarks [get]
func (c *Controller) ListBookmarks(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.bookmarks.list") {
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.personal.ListBookmarks(r.Context(), middleware.ActorFrom(r), page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.BookmarkListResponse{
		Items: items, Meta: httpx.Meta(page, total),
	})
}

// @Summary		Own participation history
// @Description	A read model over what the caller already accumulated: the events they were
// @Description	assigned to, with their team role, their recorded outcome, their artifacts and
// @Description	the count of their tasks. It owns no tables and shows only the caller's records.
// @Tags			personal
// @Produce		json
// @Security		CookieAuth
// @Param			page		query		int	false	"Page number"	default(1)
// @Param			page_size	query		int	false	"Page size"		default(50)
// @Success		200			{object}	dto.HistoryResponse
// @Failure		400			{object}	dto.ErrorResponse
// @Failure		401			{object}	dto.ErrorResponse
// @Failure		429			{object}	dto.ErrorResponse
// @Router			/me/history [get]
func (c *Controller) History(w http.ResponseWriter, r *http.Request) {
	if !c.guard(w, r, "personal.history") {
		return
	}
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.personal.History(r.Context(), middleware.ActorFrom(r), page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, dto.HistoryResponse{
		Items: items, Meta: httpx.Meta(page, total),
	})
}
