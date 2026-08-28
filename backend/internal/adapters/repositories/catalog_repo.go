package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type CatalogRepository struct{ db *DB }

func NewCatalogRepository(db *DB) *CatalogRepository { return &CatalogRepository{db: db} }

const catalogColumns = `e.id, e.title, e.description, e.organizer, e.website_url,
	e.kind, e.format, e.origin, e.country_code, e.city,
	e.track, e.prize_pool, e.prize_currency, e.team_size_max, e.start_at, e.end_at,
	(p.id IS NOT NULL) AS joined`

const catalogFrom = `FROM events e
	LEFT JOIN event_participants p
		ON p.event_id = e.id AND p.user_id = $1 AND p.participation_status = 'ASSIGNED'`

func (r *CatalogRepository) List(ctx context.Context, viewer uuid.UUID, filter models.CatalogFilter,
	page models.Page, now time.Time) ([]models.CatalogEvent, int64, error) {
	where, args := catalogFilterSQL(viewer, filter, now)

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) `+catalogFrom+` `+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `SELECT `+catalogColumns+` `+catalogFrom+` `+where+`
		ORDER BY e.start_at, e.title
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.CatalogEvent, 0, page.Limit())
	events := make([]models.Event, 0, page.Limit())
	ids := make([]uuid.UUID, 0, page.Limit())
	for rows.Next() {
		var c models.CatalogEvent
		if err := rows.Scan(&c.ID, &c.Title, &c.Description, &c.Organizer, &c.WebsiteURL,
			&c.Kind, &c.Format, &c.Origin, &c.CountryCode, &c.City,
			&c.Track, &c.PrizePool, &c.PrizeCurrency, &c.TeamSizeMax,
			&c.StartAt, &c.EndAt, &c.Joined); err != nil {
			return nil, 0, mapError(err)
		}
		c.State = catalogState(c.StartAt, c.EndAt, now)
		c.OfflineStages = []models.CatalogPlace{}
		items = append(items, c)
		events = append(events, models.Event{Format: c.Format, CountryCode: c.CountryCode, City: c.City})
		ids = append(ids, c.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, mapError(err)
	}
	if err := r.attachPlaces(ctx, items, events, ids); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *CatalogRepository) attachPlaces(ctx context.Context, items []models.CatalogEvent,
	events []models.Event, ids []uuid.UUID) error {
	if len(ids) == 0 {
		return nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT event_id, id, name, type, start_at, end_at,
		       format, country_code, city, venue, online_url
		FROM stages WHERE event_id = ANY($1)
		ORDER BY sort_order, start_at`, ids)
	if err != nil {
		return mapError(err)
	}
	defer rows.Close()

	byEvent := make(map[uuid.UUID][]models.Stage, len(ids))
	for rows.Next() {
		var stage models.Stage
		if err := rows.Scan(&stage.EventID, &stage.ID, &stage.Name, &stage.Type,
			&stage.StartAt, &stage.EndAt, &stage.Format, &stage.CountryCode,
			&stage.City, &stage.Venue, &stage.OnlineURL); err != nil {
			return mapError(err)
		}
		byEvent[stage.EventID] = append(byEvent[stage.EventID], stage)
	}
	if err := rows.Err(); err != nil {
		return mapError(err)
	}

	for i := range items {
		stages := byEvent[items[i].ID]
		items[i].EffectiveFormat = models.DeriveEventFormat(&events[i], stages)
		for _, stage := range models.OfflineStages(&events[i], stages) {
			items[i].OfflineStages = append(items[i].OfflineStages, models.CatalogPlace{
				ID: stage.ID, Name: stage.Name, Type: stage.Type,
				StartAt: stage.StartAt, EndAt: stage.EndAt,
				Place: stage.ResolvePlace(&events[i]),
			})
		}
	}
	return nil
}

func catalogState(start, end, now time.Time) models.EventState {
	switch {
	case now.Before(start):
		return models.EventUpcoming
	case now.After(end):
		return models.EventFinished
	default:
		return models.EventActive
	}
}

func catalogFilterSQL(viewer uuid.UUID, filter models.CatalogFilter, now time.Time) (string, []any) {
	args := []any{viewer}
	conds := []string{`e.published_at IS NOT NULL`, `e.archived_at IS NULL`}

	if filter.Search != "" {
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
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
	conds, args = appendCatalogTaxonomy(conds, args, filter)
	conds, args = appendCatalogStates(conds, args, filter.States, now)
	return "WHERE " + strings.Join(conds, " AND "), args
}

func appendCatalogTaxonomy(conds []string, args []any, filter models.CatalogFilter) ([]string, []any) {
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
