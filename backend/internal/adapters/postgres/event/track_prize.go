package event

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

const trackPrizeColumns = `id, display_id, track_id, event_id, place, trunc(amount)::bigint::text,
	created_at, updated_at`

func (r *Tracks) attachPrizes(ctx context.Context, ids []uuid.UUID,
	tracks map[uuid.UUID][]models.EventTrack, index map[uuid.UUID]int) error {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+trackPrizeColumns+` FROM event_track_prizes WHERE event_id = ANY($1)
		ORDER BY track_id, place`, ids)
	if err != nil {
		return mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var p models.TrackPrize
		if err := rows.Scan(&p.ID, &p.DisplayID, &p.TrackID, &p.EventID, &p.Place,
			&p.Amount, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return mapError(err)
		}
		pos, ok := index[p.TrackID]
		if !ok {
			continue
		}
		list := tracks[p.EventID]
		if pos >= len(list) {
			continue
		}
		list[pos].Prizes = append(list[pos].Prizes, p)
	}
	return mapError(rows.Err())
}

func (r *Tracks) ReplacePrizes(ctx context.Context, trackID, eventID uuid.UUID,
	prizes []models.TrackPrize) ([]models.TrackPrize, error) {
	if _, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM event_track_prizes WHERE track_id = $1`, trackID); err != nil {
		return nil, mapError(err)
	}
	out := make([]models.TrackPrize, 0, len(prizes))
	for _, p := range prizes {
		var stored models.TrackPrize
		err := r.db.Q(ctx).QueryRow(ctx, `
			INSERT INTO event_track_prizes (track_id, event_id, place, amount)
			VALUES ($1, $2, $3, $4::numeric)
			RETURNING `+trackPrizeColumns, trackID, eventID, p.Place, p.Amount).
			Scan(&stored.ID, &stored.DisplayID, &stored.TrackID, &stored.EventID,
				&stored.Place, &stored.Amount, &stored.CreatedAt, &stored.UpdatedAt)
		if err != nil {
			return nil, mapError(err)
		}
		out = append(out, stored)
	}
	return out, nil
}

func (r *Tracks) DistributedTotal(ctx context.Context, eventID uuid.UUID,
	excludeTrack *uuid.UUID) (string, error) {
	var total string
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT trunc(COALESCE(SUM(amount), 0))::bigint::text FROM event_track_prizes
		WHERE event_id = $1 AND ($2::uuid IS NULL OR track_id <> $2)`,
		eventID, excludeTrack).Scan(&total)
	if err != nil {
		return "", mapError(err)
	}
	return total, nil
}
