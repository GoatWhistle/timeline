package event

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Events struct{ db *postgres.DB }

func NewEvents(db *postgres.DB) *Events { return &Events{db: db} }

const eventColumns = `id, display_id, title, description, organizer, website_url,
	kind, format, origin, country_code, city, prize_pool, prize_currency, team_size_min, team_size_max,
	start_at, end_at, cover_manual_url, cover_auto_url, cover_auto_source, cover_auto_fetched_at,
	color_slot, color_assigned_at, published_at, archived_at, created_at, updated_at`

func scanEventInto(row pgx.Row, h *models.Event) error {
	return row.Scan(&h.ID, &h.DisplayID, &h.Title, &h.Description, &h.Organizer, &h.WebsiteURL,
		&h.Kind, &h.Format, &h.Origin, &h.CountryCode, &h.City,
		&h.PrizePool, &h.PrizeCurrency, &h.TeamSizeMin, &h.TeamSizeMax,
		&h.StartAt, &h.EndAt,
		&h.CoverManualURL, &h.CoverAutoURL, &h.CoverAutoSource, &h.CoverAutoFetchedAt,
		&h.ColorSlot, &h.ColorAssignedAt,
		&h.PublishedAt, &h.ArchivedAt, &h.CreatedAt, &h.UpdatedAt)
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
		INSERT INTO events (title, description, organizer, website_url,
			kind, format, origin, country_code, city, prize_pool, prize_currency,
			team_size_min, team_size_max, start_at, end_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING `+eventColumns,
		h.Title, h.Description, h.Organizer, h.WebsiteURL,
		h.Kind, h.Format, h.Origin, h.CountryCode, h.City, h.PrizePool,
		h.PrizeCurrency, h.TeamSizeMin, h.TeamSizeMax, h.StartAt, h.EndAt))
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

type EventLabel struct {
	DisplayID string
	Title     string
	StartAt   time.Time
}

func (r *Events) LabelsByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]EventLabel, error) {
	result := make(map[uuid.UUID]EventLabel, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT id, display_id, title, start_at FROM events WHERE id = ANY($1)`, ids)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id    uuid.UUID
			label EventLabel
		)
		if err := rows.Scan(&id, &label.DisplayID, &label.Title, &label.StartAt); err != nil {
			return nil, mapError(err)
		}
		result[id] = label
	}
	return result, mapError(rows.Err())
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
			kind = COALESCE($6, kind),
			format = COALESCE($7, format),
			origin = COALESCE($8, origin),
			country_code = CASE WHEN $9::boolean THEN $10 ELSE country_code END,
			city = CASE WHEN $11::boolean THEN $12 ELSE city END,
			prize_pool = COALESCE($13, prize_pool),
			prize_currency = COALESCE($14, prize_currency),
			team_size_min = COALESCE($15, team_size_min),
			team_size_max = COALESCE($16, team_size_max),
			start_at = COALESCE($17, start_at),
			end_at = COALESCE($18, end_at)
		WHERE id = $1
		RETURNING `+eventColumns,
		id, req.Title, req.Description, req.Organizer, req.WebsiteURL,
		req.Kind, req.Format, req.Origin,
		place.CountrySet, place.CountryCode, place.CitySet, place.City,
		req.PrizePool, req.PrizeCurrency, req.TeamSizeMin, req.TeamSizeMax,
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
