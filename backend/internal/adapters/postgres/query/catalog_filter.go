package query

import (
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func catalogFilterSQL(viewer uuid.UUID, filter dto.CatalogFilter, now time.Time) (string, []any) {
	args := []any{viewer}
	conds := []string{`e.published_at IS NOT NULL`, `e.archived_at IS NULL`}

	if filter.Search != "" {
		args = append(args, postgres.LikeContains(filter.Search))
		n := itoa(len(args))
		conds = append(conds, `(lower(e.title) LIKE $`+n+` OR lower(coalesce(e.organizer, '')) LIKE $`+n+`)`)
	}
	if filter.From != nil {
		args = append(args, *filter.From)
		conds = append(conds, `e.end_at >= $`+itoa(len(args)))
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		conds = append(conds, `e.start_at <= $`+itoa(len(args)))
	}
	if filter.Joined != nil {
		if *filter.Joined {
			conds = append(conds, `p.id IS NOT NULL`)
		} else {
			conds = append(conds, `p.id IS NULL`)
		}
	}
	conds, args = appendCatalogTaxonomy(conds, args, filter)
	conds, args = appendCatalogStates(conds, args, filter.States, now)
	return "WHERE " + strings.Join(conds, " AND "), args
}

func appendCatalogTaxonomy(conds []string, args []any, filter dto.CatalogFilter) ([]string, []any) {
	if len(filter.Origins) > 0 {
		values := make([]string, 0, len(filter.Origins))
		for _, o := range filter.Origins {
			values = append(values, string(o))
		}
		args = append(args, values)
		conds = append(conds, `e.origin = ANY($`+itoa(len(args))+`)`)
	}
	if len(filter.Formats) > 0 {
		values := make([]string, 0, len(filter.Formats))
		offline := false
		for _, f := range filter.Formats {
			values = append(values, string(f))
			if f.RequiresPlace() {
				offline = true
			}
		}
		args = append(args, values)
		cond := `e.format = ANY($` + itoa(len(args)) + `)`
		if offline {
			cond = `(` + cond + ` OR EXISTS (SELECT 1 FROM stages s
				WHERE s.event_id = e.id AND s.format IN ('OFFLINE', 'HYBRID')))`
		}
		conds = append(conds, cond)
	}
	if len(filter.Kinds) > 0 {
		values := make([]string, 0, len(filter.Kinds))
		for _, k := range filter.Kinds {
			values = append(values, string(k))
		}
		args = append(args, values)
		conds = append(conds, `e.kind = ANY($`+itoa(len(args))+`)`)
	}
	return conds, args
}

func appendCatalogStates(conds []string, args []any, states []models.EventState,
	now time.Time) ([]string, []any) {
	if len(states) == 0 {
		return conds, args
	}
	args = append(args, now)
	nowArg := `$` + itoa(len(args))
	stateConds := make([]string, 0, len(states))
	for _, st := range states {
		switch st {
		case models.EventUpcoming:
			stateConds = append(stateConds, `e.start_at > `+nowArg)
		case models.EventActive:
			stateConds = append(stateConds, `(e.start_at <= `+nowArg+` AND e.end_at >= `+nowArg+`)`)
		case models.EventFinished:
			stateConds = append(stateConds, `e.end_at < `+nowArg)
		}
	}
	if len(stateConds) == 0 {
		return conds, args
	}
	return append(conds, `(`+strings.Join(stateConds, " OR ")+`)`), args
}
