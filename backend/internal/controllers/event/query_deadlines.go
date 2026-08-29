package event

import (
	"net/http"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
)

// @Summary		Upcoming registration deadlines
// @Description	Participants in TODO whose deadline falls within the given window.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			within_hours	query		int	false	"Window in hours"	default(72)
// @Param			page			query		int	false	"Page number"		default(1)
// @Param			page_size		query		int	false	"Page size"			default(50)
// @Success		200				{object}	models.DeadlinePage
// @Failure		403				{object}	models.ErrorResponse
// @Router			/admin/queries/upcoming [get]
func (c *QueryController) Upcoming(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	within := 72 * time.Hour
	if v := httpx.QueryTrimmed(r, "within_hours"); v != "" {
		d, err := time.ParseDuration(v + "h")
		if err != nil || d <= 0 {
			httpx.Error(w, r, models.NewValidation("within_hours must be a positive number"))
			return
		}
		within = d
	}
	items, total, err := c.svc.Upcoming(r.Context(), middleware.ActorFrom(r), within, page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.DeadlinePage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Overdue registrations
// @Description	Participants in TODO whose deadline has passed while the event has not finished.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Param			page		query		int	false	"Page number"	default(1)
// @Param			page_size	query		int	false	"Page size"		default(50)
// @Success		200			{object}	models.DeadlinePage
// @Failure		403			{object}	models.ErrorResponse
// @Router			/admin/queries/overdue [get]
func (c *QueryController) Overdue(w http.ResponseWriter, r *http.Request) {
	page, err := httpx.ParsePage(r, c.pageDef, c.pageMax)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	items, total, err := c.svc.Overdue(r.Context(), middleware.ActorFrom(r), page)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, models.DeadlinePage{Items: items, Meta: httpx.Meta(page, total)})
}

// @Summary		Registration coverage
// @Description	Share of assigned participants who have self-reported registration across every
// @Description	published, non-archived event with an ACTIVE registration. The system never checks
// @Description	the external site: DONE means the participant said so, NOT_REQUIRED means an
// @Description	administrator waived the requirement, and both count as covered. When no event
// @Description	requires registration the aggregate is not applicable and share is omitted rather
// @Description	than reported as zero.
// @Tags			queries
// @Produce		json
// @Security		CookieAuth
// @Success		200	{object}	models.RegistrationCoverage
// @Failure		403	{object}	models.ErrorResponse
// @Router			/admin/queries/registration-coverage [get]
func (c *QueryController) RegistrationCoverage(w http.ResponseWriter, r *http.Request) {
	coverage, err := c.svc.RegistrationCoverage(r.Context(), middleware.ActorFrom(r))
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusOK, coverage)
}
