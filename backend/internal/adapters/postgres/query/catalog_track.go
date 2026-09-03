package query

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/models/dto"
)

const trackSummarySQL = `
	SELECT t.event_id, t.display_id, t.track_no, t.name,
	       trunc(COALESCE(p.total, 0))::bigint::text
	FROM event_tracks t
	LEFT JOIN (
		SELECT track_id, SUM(amount) AS total FROM event_track_prizes GROUP BY track_id
	) p ON p.track_id = t.id
	WHERE t.event_id = ANY($1)
	ORDER BY t.event_id, t.track_no`

func TrackSummaries(ctx context.Context, q interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}, ids []uuid.UUID) (map[uuid.UUID][]dto.EventTrackSummary, error) {
	byEvent := make(map[uuid.UUID][]dto.EventTrackSummary, len(ids))
	if len(ids) == 0 {
		return byEvent, nil
	}
	rows, err := q.Query(ctx, trackSummarySQL, ids)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var eventID uuid.UUID
		var summary dto.EventTrackSummary
		if err := rows.Scan(&eventID, &summary.ID, &summary.TrackNo,
			&summary.Name, &summary.PrizeTotal); err != nil {
			return nil, mapError(err)
		}
		byEvent[eventID] = append(byEvent[eventID], summary)
	}
	return byEvent, mapError(rows.Err())
}

func AttachTrackSummaries(ctx context.Context, q interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}, items []dto.CatalogEvent, ids []uuid.UUID) error {
	byEvent, err := TrackSummaries(ctx, q, ids)
	if err != nil {
		return err
	}
	for i := range items {
		tracks := byEvent[ids[i]]
		if tracks == nil {
			tracks = []dto.EventTrackSummary{}
		}
		items[i].Tracks = tracks
	}
	return nil
}
