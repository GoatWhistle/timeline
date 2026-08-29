package event

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Stages struct{ db *postgres.DB }

func NewStages(db *postgres.DB) *Stages { return &Stages{db: db} }

const stageColumns = `id, display_id, event_id, name, type, start_at, end_at, description, url,
	format, country_code, city, venue, online_url, sort_order, created_at, updated_at`

func scanStage(row pgx.Row) (*models.Stage, error) {
	var s models.Stage
	err := row.Scan(&s.ID, &s.DisplayID, &s.EventID, &s.Name, &s.Type, &s.StartAt, &s.EndAt,
		&s.Description, &s.URL, &s.Format, &s.CountryCode, &s.City, &s.Venue, &s.OnlineURL,
		&s.SortOrder, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &s, nil
}

func (r *Stages) Create(ctx context.Context, s *models.Stage) (*models.Stage, error) {
	return scanStage(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO stages (event_id, name, type, start_at, end_at, description, url,
			format, country_code, city, venue, online_url, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING `+stageColumns,
		s.EventID, s.Name, s.Type, s.StartAt, s.EndAt, s.Description, s.URL,
		s.Format, s.CountryCode, s.City, s.Venue, s.OnlineURL, s.SortOrder))
}

func (r *Stages) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM stages WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("stage not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Stages) GetByID(ctx context.Context, id uuid.UUID) (*models.Stage, error) {
	return scanStage(r.db.Q(ctx).QueryRow(ctx, `SELECT `+stageColumns+` FROM stages WHERE id = $1`, id))
}

func (r *Stages) Update(ctx context.Context, id uuid.UUID, req models.UpdateStageRequest,
	place models.StagePlacePatch) (*models.Stage, error) {
	return scanStage(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE stages SET
			name = COALESCE($2, name),
			type = COALESCE($3, type),
			start_at = COALESCE($4, start_at),
			end_at = COALESCE($5, end_at),
			description = COALESCE($6, description),
			url = COALESCE($7, url),
			format = CASE WHEN $8::boolean THEN $9::text ELSE format END,
			country_code = CASE WHEN $8::boolean THEN $10::char(2) ELSE country_code END,
			city = CASE WHEN $8::boolean THEN $11::text ELSE city END,
			venue = CASE WHEN $12::boolean THEN $13::text ELSE venue END,
			online_url = CASE WHEN $14::boolean THEN $15::text ELSE online_url END,
			sort_order = COALESCE($16, sort_order)
		WHERE id = $1
		RETURNING `+stageColumns,
		id, req.Name, req.Type, req.StartAt, req.EndAt, req.Description, req.URL,
		place.FormatSet, place.Format, place.CountryCode, place.City,
		place.VenueSet, place.Venue, place.OnlineURLSet, place.OnlineURL, req.SortOrder))
}

func (r *Stages) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `DELETE FROM stages WHERE id = $1`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Stages) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]models.Stage, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+stageColumns+` FROM stages WHERE event_id = $1
		ORDER BY sort_order, start_at`, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Stage, 0, 8)
	for rows.Next() {
		var s models.Stage
		if err := rows.Scan(&s.ID, &s.DisplayID, &s.EventID, &s.Name, &s.Type, &s.StartAt, &s.EndAt,
			&s.Description, &s.URL, &s.Format, &s.CountryCode, &s.City, &s.Venue, &s.OnlineURL,
			&s.SortOrder, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, s)
	}
	return items, mapError(rows.Err())
}

func (r *Stages) ListByEvents(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]models.Stage, error) {
	result := make(map[uuid.UUID][]models.Stage, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+stageColumns+` FROM stages WHERE event_id = ANY($1)
		ORDER BY sort_order, start_at`, ids)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var s models.Stage
		if err := rows.Scan(&s.ID, &s.DisplayID, &s.EventID, &s.Name, &s.Type, &s.StartAt, &s.EndAt,
			&s.Description, &s.URL, &s.Format, &s.CountryCode, &s.City, &s.Venue, &s.OnlineURL,
			&s.SortOrder, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		result[s.EventID] = append(result[s.EventID], s)
	}
	return result, mapError(rows.Err())
}
