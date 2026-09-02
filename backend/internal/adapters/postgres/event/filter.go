package event

import (
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

const publishedAnd = `(archived_at IS NULL AND published_at IS NOT NULL AND `

func eventFilterSQL(filter models.EventFilter, now time.Time) (string, []any) {
	conds := make([]string, 0, 4)
	args := make([]any, 0, 4)

	if filter.Search != "" {
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
		n := itoa(len(args))
		conds = append(conds,
			`(lower(title) LIKE $`+n+` OR lower(coalesce(organizer, '')) LIKE $`+n+`)`)
	}
	if !filter.IncludeArchived && !containsState(filter.States, models.EventArchived) {
		conds = append(conds, `archived_at IS NULL`)
	}
	if len(filter.States) > 0 {
		nowArg := `$` + itoa(len(args)+1)
		usesNow := false
		stateConds := make([]string, 0, len(filter.States))
		for _, st := range filter.States {
			switch st {
			case models.EventArchived:
				stateConds = append(stateConds, `archived_at IS NOT NULL`)
			case models.EventUnpublished:
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NULL)`)
			case models.EventUpcoming:
				usesNow = true
				stateConds = append(stateConds, publishedAnd+`start_at > `+nowArg+`)`)
			case models.EventActive:
				usesNow = true
				stateConds = append(stateConds,
					publishedAnd+`start_at <= `+nowArg+` AND end_at >= `+nowArg+`)`)
			case models.EventFinished:
				usesNow = true
				stateConds = append(stateConds, publishedAnd+`end_at < `+nowArg+`)`)
			}
		}
		if usesNow {
			args = append(args, now)
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
