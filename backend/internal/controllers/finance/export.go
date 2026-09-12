package finance

import (
	"encoding/csv"
	"net/http"
	"strconv"

	"github.com/GoatWhistle/timeline/internal/controllers/httpx"
	"github.com/GoatWhistle/timeline/internal/controllers/middleware"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const exportFilename = "finance.csv"

var exportHeader = []string{"section", "track", "award", "partner", "amount", "currency"}

// @Summary		Export the finance reconciliation as CSV
// @Description	The same figures the finance endpoint returns, flattened into rows instead of a
// @Description	tree: one row per track place or nomination, one row per case, and the totals of
// @Description	the reconciliation last. The `section` column says which of the three a row is.
// @Description
// @Description	Access follows the finance endpoint itself.
// @Tags			finance
// @Produce		text/csv
// @Security		CookieAuth
// @Param			id	path		string	true	"Event identifier"	example(ev_3k7d8gb9be)
// @Success		200	{string}	string	"CSV payload"
// @Failure		403	{object}	dto.ErrorResponse
// @Failure		404	{object}	dto.ErrorResponse
// @Router			/events/{id}/finance/export [get]
func (c *Controller) Export(w http.ResponseWriter, r *http.Request) {
	id, err := c.eventID(r, "id")
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	summary, err := c.finance.Summary(r.Context(), middleware.ActorFrom(r), id)
	if err != nil {
		httpx.Error(w, r, err)
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+exportFilename+`"`)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-store")

	writer := csv.NewWriter(w)
	if err := writer.Write(exportHeader); err != nil {
		httpx.LogStreamFailure(r, "finance export failed", err)
		return
	}
	for _, row := range ExportRows(summary) {
		if err := writer.Write(row); err != nil {
			httpx.LogStreamFailure(r, "finance export failed", err)
			return
		}
	}
	writer.Flush()
}

func ExportRows(summary *dto.EventFinanceResponse) [][]string {
	currency := optional(summary.PrizeCurrency)
	rows := make([][]string, 0, 16)
	for _, track := range summary.Tracks {
		for _, prize := range track.Prizes {
			rows = append(rows, []string{
				"TRACK_PRIZE", track.Name, award(prize), "", prize.Amount, currency,
			})
		}
	}
	for _, item := range summary.Cases {
		rows = append(rows, []string{
			"CASE", optional(item.TrackName), item.Name, optional(item.Partner),
			optional(item.PrizeAmount), currency,
		})
	}
	rows = append(rows,
		[]string{"TOTAL", "", "prize_pool", "", optional(summary.PrizePool), currency},
		[]string{"TOTAL", "", "distributed_tracks", "", summary.DistributedTracks, currency},
		[]string{"TOTAL", "", "distributed_cases", "", summary.DistributedCases, currency},
		[]string{"TOTAL", "", "distributed", "", summary.Distributed, currency},
		[]string{"TOTAL", "", "nominations", "", summary.Nominations, currency},
		[]string{"TOTAL", "", "unallocated", "", optional(summary.Unallocated), currency},
		[]string{"TOTAL", "", "discrepancy", "", optional(summary.Discrepancy), currency},
	)
	return rows
}

func award(prize dto.FinanceTrackPrize) string {
	if prize.Place != nil {
		return "place " + strconv.Itoa(*prize.Place)
	}
	return optional(prize.Title)
}

func optional(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
