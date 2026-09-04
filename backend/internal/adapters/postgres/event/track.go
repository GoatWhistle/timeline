package event

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Tracks struct{ db *postgres.DB }

func NewTracks(db *postgres.DB) *Tracks { return &Tracks{db: db} }

const trackColumns = `id, display_id, event_id, track_no, name, description, created_at, updated_at`

func scanTrack(row pgx.Row) (*models.EventTrack, error) {
	var t models.EventTrack
	err := row.Scan(&t.ID, &t.DisplayID, &t.EventID, &t.TrackNo, &t.Name, &t.Description,
		&t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &t, nil
}

func (r *Tracks) Create(ctx context.Context, t *models.EventTrack) (*models.EventTrack, error) {
	return scanTrack(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO event_tracks (event_id, track_no, name, description)
		VALUES ($1, $2, $3, $4)
		RETURNING `+trackColumns, t.EventID, t.TrackNo, t.Name, t.Description))
}

func (r *Tracks) Update(ctx context.Context, id uuid.UUID, name *string,
	description *string, trackNo *int) (*models.EventTrack, error) {
	return scanTrack(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE event_tracks SET
			name = COALESCE($2, name),
			description = COALESCE($3, description),
			track_no = COALESCE($4, track_no)
		WHERE id = $1
		RETURNING `+trackColumns, id, name, description, trackNo))
}

func (r *Tracks) OccupantOfTrackNo(ctx context.Context, eventID uuid.UUID, id uuid.UUID,
	trackNo int) (uuid.UUID, error) {
	var occupant uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT id FROM event_tracks
		WHERE event_id = $1 AND track_no = $3 AND id <> $2 FOR UPDATE`,
		eventID, id, trackNo).Scan(&occupant)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, nil
	}
	if err != nil {
		return uuid.Nil, mapError(err)
	}
	return occupant, nil
}

func (r *Tracks) ParkTrackNo(ctx context.Context, eventID uuid.UUID, id uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE event_tracks SET track_no = (
			SELECT n FROM generate_series(1, 50) AS n
			WHERE NOT EXISTS (
				SELECT 1 FROM event_tracks WHERE event_id = $1 AND track_no = n
			)
			ORDER BY n LIMIT 1
		) WHERE id = $2`, eventID, id)
	if err != nil {
		return mapError(err)
	}
	return nil
}

func (r *Tracks) SetTrackNo(ctx context.Context, id uuid.UUID, trackNo int) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE event_tracks SET track_no = $2 WHERE id = $1`, id, trackNo)
	if err != nil {
		return mapError(err)
	}
	return nil
}

func (r *Tracks) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `DELETE FROM event_tracks WHERE id = $1`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Tracks) GetByID(ctx context.Context, id uuid.UUID) (*models.EventTrack, error) {
	return scanTrack(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+trackColumns+` FROM event_tracks WHERE id = $1`, id))
}

func (r *Tracks) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM event_tracks WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("event track not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Tracks) NextTrackNo(ctx context.Context, eventID uuid.UUID) (int, error) {
	var next int
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT COALESCE(MAX(track_no), 0) + 1 FROM event_tracks WHERE event_id = $1`,
		eventID).Scan(&next)
	if err != nil {
		return 0, mapError(err)
	}
	return next, nil
}

func (r *Tracks) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]models.EventTrack, error) {
	items, err := r.listByEvents(ctx, []uuid.UUID{eventID})
	if err != nil {
		return nil, err
	}
	return items[eventID], nil
}

func (r *Tracks) ListByEvents(ctx context.Context,
	ids []uuid.UUID) (map[uuid.UUID][]models.EventTrack, error) {
	return r.listByEvents(ctx, ids)
}

func (r *Tracks) listByEvents(ctx context.Context,
	ids []uuid.UUID) (map[uuid.UUID][]models.EventTrack, error) {
	result := make(map[uuid.UUID][]models.EventTrack, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+trackColumns+` FROM event_tracks WHERE event_id = ANY($1)
		ORDER BY event_id, track_no`, ids)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	index := make(map[uuid.UUID]int, 16)
	for rows.Next() {
		var t models.EventTrack
		if err := rows.Scan(&t.ID, &t.DisplayID, &t.EventID, &t.TrackNo, &t.Name,
			&t.Description, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		t.Prizes = make([]models.TrackPrize, 0, 3)
		result[t.EventID] = append(result[t.EventID], t)
		index[t.ID] = len(result[t.EventID]) - 1
	}
	if err := mapError(rows.Err()); err != nil {
		return nil, err
	}
	return result, r.attachPrizes(ctx, ids, result, index)
}
