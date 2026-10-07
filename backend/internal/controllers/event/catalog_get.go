package event

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Catalog event
// @Description	One published event in the catalog payload, for anyone signed in, whether or not
// @Description	they take part. It is the full card of an event the caller has not joined: the
// @Description	participant card on /events/{id} stays private to its participants. An unpublished
// @Description	or archived event is answered with 404, the same as an unknown one, because the
// @Description	catalog never shows it.
// @Tags			catalog
// @Produce		json
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{object}	dto.CatalogEvent
// @Failure		401	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Failure		429	{object}	dto.ErrorResponse	"too many catalog requests"
// @Router			/catalog/{id} [get]
func (c *CatalogController) Get(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r, "catalog.list") {
		httpx.Error(w, r, models.NewRateLimited("too many catalog requests"))
		return
	}
	id, err := httpx.PathDisplayID(r, "id", dto.DisplayKindEvent, c.catalog.ResolveDisplayID)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	item, err := c.catalog.Get(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, item)
}
