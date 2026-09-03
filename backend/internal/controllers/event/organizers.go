package event

import (
	"net/http"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

// @Summary		Organizer suggestions
// @Description	The distinct organiser names already used by events the caller may see, offered
// @Description	while an organiser is being typed. The field itself stays free text: a name that
// @Description	is not on the list yet remains valid, so this is a suggestion list and not a
// @Description	closed set of values.
// @Description
// @Description	Visibility follows the same rule as every other read. An administrator sees the
// @Description	organisers of all events; anyone else sees only those of published, non-archived
// @Description	ones, so an unpublished event is never disclosed through a suggestion.
// @Tags			catalog
// @Produce		json
// @Security		CookieAuth
// @Param			search	query		string	false	"Narrow the suggestions by substring"
// @Success		200		{object}	dto.OrganizerSuggestions
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		429		{object}	dto.ErrorResponse	"too many catalog requests"
// @Router			/organizers [get]
func (c *CatalogController) Organizers(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r, "catalog.organizers") {
		httpx.Error(w, r, models.NewRateLimited("too many catalog requests"))
		return
	}
	items, err := c.catalog.Organizers(
		r.Context(), middleware.ActorFrom(r), httpx.QueryTrimmed(r, "search"),
	)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	if items == nil {
		items = []string{}
	}
	httpx.JSON(w, http.StatusOK, dto.OrganizerSuggestions{Items: items})
}
