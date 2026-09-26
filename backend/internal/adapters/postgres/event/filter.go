package event

import (
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

const publishedAnd = `(archived_at IS NULL AND published_at IS NOT NULL AND `

func eventFilterSQL(filter models.EventFilter, now time.Time) (string, []any) {
	conds := make([]string, 0, 4)
	args := make([]any, 0, 4)

	if filter.Search != "" {
		args = append(args, postgres.LikeContains(filter.Search))
		n := itoa(len(args))
		conds = append(conds,
			`(lower(title) LIKE $`+n+` OR lower(coalesce(organizer, '')) LIKE $`+n+`)`)
	}
	if !filter.IncludeArchived && !containsState(filter.States, models.EventArchived) {
		conds = append(conds, `archived_at IS NULL`)
	}
	if filter.From != nil {
		args = append(args, *filter.From)
		conds = append(conds, `end_at >= $`+itoa(len(args)))
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		conds = append(conds, `start_at <= $`+itoa(len(args)))
	}
	if len(filter.States) > 0 {
		if statesNeedNow(filter.States) {
			args = append(args, now)
		}
		nowArg := `$` + itoa(len(args))
		stateConds := make([]string, 0, len(filter.States))
		for _, st := range filter.States {
			switch st {
			case models.EventArchived:
				stateConds = append(stateConds, `archived_at IS NOT NULL`)
			case models.EventUnpublished:
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NULL)`)
			case models.EventUpcoming:
				stateConds = append(stateConds, publishedAnd+`start_at > `+nowArg+`)`)
			case models.EventActive:
				stateConds = append(stateConds,
					publishedAnd+`start_at <= `+nowArg+` AND end_at >= `+nowArg+`)`)
			case models.EventFinished:
				stateConds = append(stateConds, publishedAnd+`end_at < `+nowArg+`)`)
			}
		}
		if len(stateConds) > 0 {
			conds = append(conds, `(`+strings.Join(stateConds, " OR ")+`)`)
		}
	}
	conds, args = appendTaxonomy(conds, args, filter.Origins, filter.Formats, filter.Kinds)
	if len(conds) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(conds, " AND "), args
}

func appendTaxonomy(conds []string, args []any, origins []models.EventOrigin,
	formats []models.EventFormat, kinds []models.EventKind) ([]string, []any) {
	if len(origins) > 0 {
		values := make([]string, 0, len(origins))
		for _, o := range origins {
			values = append(values, string(o))
		}
		args = append(args, values)
		conds = append(conds, `origin = ANY($`+itoa(len(args))+`)`)
	}
	if len(formats) > 0 {
		values := make([]string, 0, len(formats))
		for _, f := range formats {
			values = append(values, string(f))
		}
		args = append(args, values)
		conds = append(conds, `format = ANY($`+itoa(len(args))+`)`)
	}
	if len(kinds) > 0 {
		values := make([]string, 0, len(kinds))
		for _, k := range kinds {
			values = append(values, string(k))
		}
		args = append(args, values)
		conds = append(conds, `kind = ANY($`+itoa(len(args))+`)`)
	}
	return conds, args
}

func containsState(states []models.EventState, target models.EventState) bool {
	for _, s := range states {
		if s == target {
			return true
		}
	}
	return false
}

var eventSortColumns = map[models.CatalogSortField]string{
	models.CatalogSortStartAt:  "start_at",
	models.CatalogSortEndAt:    "end_at",
	models.CatalogSortTitle:    "lower(title)",
	models.CatalogSortDuration: "(end_at - start_at)",
	models.CatalogSortPrize:    "prize_pool",
	models.CatalogSortTeamMin:  "team_size_min",
	models.CatalogSortTeamMax:  "team_size_max",
}

func eventOrderSQL(sort models.CatalogSort) string {
	column, ok := eventSortColumns[sort.Field]
	if !ok {
		return "start_at DESC, title"
	}
	direction := "ASC"
	if sort.Direction == models.CatalogSortDesc {
		direction = "DESC"
	}
	if sort.Field.Nullable() {
		direction += " NULLS LAST"
	}
	if sort.Field == models.CatalogSortTitle {
		return column + " " + direction + ", start_at ASC"
	}
	return column + " " + direction + ", lower(title) ASC"
}

func statesNeedNow(states []models.EventState) bool {
	for _, st := range states {
		switch st {
		case models.EventUpcoming, models.EventActive, models.EventFinished:
			return true
		}
	}
	return false
}
