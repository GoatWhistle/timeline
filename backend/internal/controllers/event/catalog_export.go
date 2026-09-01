package event

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const catalogExportFilename = "catalog.csv"

var catalogExportHeader = []string{
	"id", "title", "kind", "state", "format", "effective_format", "origin",
	"country_code", "city", "start_at", "end_at", "organizer", "track",
	"prize_pool", "prize_currency", "team_size_max", "website_url", "joined",
}

// @Summary		Export the catalog as CSV
// @Description	The same events the catalog listing returns, under the same filters and the same
// @Description	sort, streamed as CSV instead of paginated JSON. Only the fields the listing itself
// @Description	exposes are written: the export carries no administrative notes.
// @Description
// @Description	Like the listing it requires a session and is counted against the catalog rate
// @Description	limit of the account. Rows are streamed as they are read, so the response is not
// @Description	built in memory.
// @Description
// @Description	The `joined` column repeats the participation the listing shows. It says whether
// @Description	the account takes part in the event, not whether anyone registered on an external
// @Description	site: the system never checks that.
// @Tags			catalog
// @Produce		text/csv
// @Security		CookieAuth
// @Param			search	query		string	false	"Search by title and organiser"
// @Param			origin	query		string	false	"Comma-separated origin filter"	Enums(RU,WORLD)
// @Param			format	query		string	false	"Comma-separated format filter"	Enums(ONLINE,OFFLINE,HYBRID)
// @Param			kind	query		string	false	"Comma-separated kind filter"	Enums(HACKATHON,MEETUP)
// @Param			state	query		string	false	"Comma-separated state filter"	Enums(UPCOMING,ACTIVE,FINISHED)
// @Param			from	query		string	false	"Lower bound of the period"		format(date-time)
// @Param			to		query		string	false	"Upper bound of the period"		format(date-time)
// @Param			sort	query		string	false	"Sort field"					Enums(start_at,end_at,title)	default(start_at)
// @Param			order	query		string	false	"Sort direction"				Enums(asc,desc)					default(asc)
// @Success		200		{string}	string	"CSV payload"
// @Failure		400		{object}	dto.ErrorResponse
// @Failure		401		{object}	dto.ErrorResponse
// @Failure		429		{object}	dto.ErrorResponse	"too many catalog requests"
// @Router			/catalog/export [get]
func (c *CatalogController) Export(w http.ResponseWriter, r *http.Request) {
	if !c.allow(r, "catalog.list") {
		httpx.Error(w, r, models.NewRateLimited("too many catalog requests"))
		return
	}
	filter, err := parseCatalogFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+catalogExportFilename+`"`)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")

	writer := csv.NewWriter(w)
	if err := writer.Write(catalogExportHeader); err != nil {
		httpx.Error(w, r, err)
		return
	}
	writer.Flush()
	flush(w)

	err = c.catalog.Stream(r.Context(), middleware.ActorFrom(r), filter,
		func(item dto.CatalogEvent) error {
			if err := writer.Write(catalogExportRow(item)); err != nil {
				return err
			}
			writer.Flush()
			if err := writer.Error(); err != nil {
				return err
			}
			flush(w)
			return nil
		})
	if err != nil {
		httpx.LogStreamFailure(r, "catalog export failed", err)
		return
	}
	writer.Flush()
}

func flush(w http.ResponseWriter) {
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}

func catalogExportRow(item dto.CatalogEvent) []string {
	return []string{
		item.ID,
		item.Title,
		string(item.Kind),
		string(item.State),
		string(item.Format),
		string(item.EffectiveFormat),
		string(item.Origin),
		text(item.CountryCode),
		text(item.City),
		item.StartAt.UTC().Format(time.RFC3339),
		item.EndAt.UTC().Format(time.RFC3339),
		text(item.Organizer),
		text(item.Track),
		text(item.PrizePool),
		text(item.PrizeCurrency),
		number(item.TeamSizeMax),
		text(item.WebsiteURL),
		strconv.FormatBool(item.Joined),
	}
}

func text(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func number(value *int) string {
	if value == nil {
		return ""
	}
	return strconv.Itoa(*value)
}
