package event

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Events struct{ db *postgres.DB }

func NewEvents(db *postgres.DB) *Events { return &Events{db: db} }

const eventColumns = `id, display_id, title, description, organizer, website_url, notes,
	kind, format, origin, country_code, city, track, prize_pool, prize_currency, team_size_max,
	start_at, end_at, published_at, archived_at, created_at, updated_at`

func scanEventInto(row pgx.Row, h *models.Event) error {
	return row.Scan(&h.ID, &h.DisplayID, &h.Title, &h.Description, &h.Organizer, &h.WebsiteURL, &h.Notes,
		&h.Kind, &h.Format, &h.Origin, &h.CountryCode, &h.City,
		&h.Track, &h.PrizePool, &h.PrizeCurrency, &h.TeamSizeMax,
		&h.StartAt, &h.EndAt, &h.PublishedAt, &h.ArchivedAt, &h.CreatedAt, &h.UpdatedAt)
}

func scanEvent(row pgx.Row) (*models.Event, error) {
	var h models.Event
	if err := scanEventInto(row, &h); err != nil {
		return nil, mapError(err)
	}
	return &h, nil
}

func (r *Events) Create(ctx context.Context, h *models.Event) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO events (title, description, organizer, website_url, notes,
			kind, format, origin, country_code, city, track, prize_pool, prize_currency,
			team_size_max, start_at, end_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING `+eventColumns,
		h.Title, h.Description, h.Organizer, h.WebsiteURL, h.Notes,
		h.Kind, h.Format, h.Origin, h.CountryCode, h.City, h.Track, h.PrizePool,
		h.PrizeCurrency, h.TeamSizeMax, h.StartAt, h.EndAt))
}

func (r *Events) GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `SELECT `+eventColumns+` FROM events WHERE id = $1`, id))
}

func (r *Events) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM events WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("event not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Events) DisplayIDByID(ctx context.Context, id uuid.UUID) (string, error) {
	var displayID string
	if err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT display_id FROM events WHERE id = $1`, id).Scan(&displayID); err != nil {
		return "", mapError(err)
	}
	return displayID, nil
}

func (r *Events) GetForUpdate(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+eventColumns+` FROM events WHERE id = $1 FOR UPDATE`, id))
}

func (r *Events) Update(ctx context.Context, id uuid.UUID, req dto.UpdateEventRequest,
	place dto.EventPlacePatch) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET
			title = COALESCE($2, title),
			description = COALESCE($3, description),
			organizer = COALESCE($4, organizer),
			website_url = COALESCE($5, website_url),
			notes = COALESCE($6, notes),
			kind = COALESCE($7, kind),
			format = COALESCE($8, format),
			origin = COALESCE($9, origin),
			country_code = CASE WHEN $10::boolean THEN $11 ELSE country_code END,
			city = CASE WHEN $12::boolean THEN $13 ELSE city END,
			track = COALESCE($14, track),
			prize_pool = COALESCE($15, prize_pool),
			prize_currency = COALESCE($16, prize_currency),
			team_size_max = COALESCE($17, team_size_max),
			start_at = COALESCE($18, start_at),
			end_at = COALESCE($19, end_at)
		WHERE id = $1
		RETURNING `+eventColumns,
		id, req.Title, req.Description, req.Organizer, req.WebsiteURL, req.Notes,
		req.Kind, req.Format, req.Origin,
		place.CountrySet, place.CountryCode, place.CitySet, place.City,
		req.Track, req.PrizePool, req.PrizeCurrency, req.TeamSizeMax,
		req.StartAt, req.EndAt))
}

func (r *Events) Publish(ctx context.Context, id uuid.UUID, at time.Time) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET published_at = $2
		WHERE id = $1 AND published_at IS NULL AND archived_at IS NULL
		RETURNING `+eventColumns, id, at))
}

func (r *Events) Archive(ctx context.Context, id uuid.UUID, at time.Time) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET archived_at = $2
		WHERE id = $1 AND archived_at IS NULL
		RETURNING `+eventColumns, id, at))
}

func (r *Events) List(ctx context.Context, filter models.EventFilter, page models.Page, now time.Time) ([]models.Event, int64, error) {
	where, args := eventFilterSQL(filter, now)

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) FROM events `+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+eventColumns+` FROM events `+where+`
		ORDER BY start_at DESC, title
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Event, 0, page.Limit())
	for rows.Next() {
		var h models.Event
		if err := scanEventInto(rows, &h); err != nil {
			return nil, 0, mapError(err)
		}
		items = append(items, h)
	}
	return items, total, mapError(rows.Err())
}

func eventFilterSQL(filter models.EventFilter, now time.Time) (string, []any) {
	conds := make([]string, 0, 4)
	args := make([]any, 0, 4)

	if filter.Search != "" {
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
		conds = append(conds, `(lower(title) LIKE $`+itoa(len(args))+` OR lower(coalesce(organizer, '')) LIKE $`+itoa(len(args))+`)`)
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
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NOT NULL AND start_at > `+nowArg+`)`)
			case models.EventActive:
				usesNow = true
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NOT NULL AND start_at <= `+nowArg+` AND end_at >= `+nowArg+`)`)
			case models.EventFinished:
				usesNow = true
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NOT NULL AND end_at < `+nowArg+`)`)
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
