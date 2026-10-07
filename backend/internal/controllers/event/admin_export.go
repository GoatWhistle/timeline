package event

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/controllers/presenter"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const (
	adminExportFilename = "events.csv"
	adminExportPageSize = 200
)

var adminExportHeader = []string{
	"id", "title", "kind", "state", "format", "effective_format", "origin",
	"country_code", "city", "start_at", "end_at", "duration_days", "organizer", "tracks",
	"prize_pool", "prize_currency", "team_size_min", "team_size_max", "website_url",
	"published_at", "archived_at", "created_at", "updated_at",
}

// @Summary		Export the administrative event list as CSV
// @Description	Every event the administrative list returns under the same filters and the same
// @Description	sort, drafts and archived records included when the filters ask for them, streamed
// @Description	as CSV instead of paginated JSON. Rows are written page by page as they are read.
// @Tags			events
// @Produce		text/csv
// @Security		CookieAuth
// @Param			search				query		string	false	"Search by title and organiser"
// @Param			state				query		string	false	"Comma-separated state filter"	Enums(UNPUBLISHED,UPCOMING,ACTIVE,FINISHED,ARCHIVED)
// @Param			kind				query		string	false	"Comma-separated kind filter"	Enums(HACKATHON,MEETUP)
// @Param			origin				query		string	false	"Comma-separated origin filter"	Enums(RU,WORLD)
// @Param			format				query		string	false	"Comma-separated format filter"	Enums(ONLINE,OFFLINE,HYBRID)
// @Param			include_archived	query		bool	false	"Include archived records"
// @Param			from				query		string	false	"Events ending on or after this moment"
// @Param			to					query		string	false	"Events starting on or before this moment"
// @Param			sort				query		string	false	"Sort field"		Enums(start_at,end_at,title,duration,prize,team_min,team_max,tracks)
// @Param			order				query		string	false	"Sort direction"	Enums(asc,desc)
// @Success		200					{string}	string	"CSV payload"
// @Failure		400					{object}	dto.ErrorResponse
// @Failure		401					{object}	dto.ErrorResponse
// @Failure		403					{object}	dto.ErrorResponse
// @Router			/admin/events/export [get]
func (c *Controller) Export(w http.ResponseWriter, r *http.Request) {
	filter, err := parseEventFilter(r)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	actor := middleware.ActorFrom(r)
	first, total, err := c.events.List(r.Context(), actor, filter,
		models.Page{Number: 1, Size: adminExportPageSize})
	if err != nil {
		httpx.Error(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+adminExportFilename+`"`)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")

	writer := csv.NewWriter(w)
	if err := writer.Write(adminExportHeader); err != nil {
		httpx.LogStreamFailure(r, "admin event export failed", err)
		return
	}
	now := time.Now().UTC()
	items := first
	written := 0
	for page := 1; ; page++ {
		for i := range items {
			row := adminExportRow(presenter.EventResponse(&items[i], now, true))
			if err := writer.Write(row); err != nil {
				httpx.LogStreamFailure(r, "admin event export failed", err)
				return
			}
		}
		written += len(items)
		writer.Flush()
		flush(w)
		if len(items) < adminExportPageSize || int64(written) >= total {
			break
		}
		items, _, err = c.events.List(r.Context(), actor, filter,
			models.Page{Number: page + 1, Size: adminExportPageSize})
		if err != nil {
			httpx.LogStreamFailure(r, "admin event export failed", err)
			return
		}
	}
	writer.Flush()
}

func adminExportRow(item dto.EventResponse) []string {
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
		strconv.Itoa(models.DurationDays(item.StartAt, item.EndAt)),
		text(item.Organizer),
		trackNames(item.Tracks),
		text(item.PrizePool),
		text(item.PrizeCurrency),
		number(item.TeamSizeMin),
		number(item.TeamSizeMax),
		text(item.WebsiteURL),
		moment(item.PublishedAt),
		moment(item.ArchivedAt),
		item.CreatedAt.UTC().Format(time.RFC3339),
		item.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func moment(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
