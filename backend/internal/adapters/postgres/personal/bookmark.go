package personal

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Bookmarks struct{ db *postgres.DB }

func NewBookmarks(db *postgres.DB) *Bookmarks { return &Bookmarks{db: db} }

func (r *Bookmarks) Add(ctx context.Context, userID, eventID uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		INSERT INTO event_bookmarks (user_id, event_id) VALUES ($1, $2)
		ON CONFLICT (user_id, event_id) DO NOTHING`, userID, eventID)
	return mapError(err)
}

func (r *Bookmarks) Remove(ctx context.Context, userID, eventID uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM event_bookmarks WHERE user_id = $1 AND event_id = $2`, userID, eventID)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Bookmarks) IDs(ctx context.Context, userID uuid.UUID, eventIDs []uuid.UUID) (map[uuid.UUID]bool, error) {
	marked := make(map[uuid.UUID]bool, len(eventIDs))
	if len(eventIDs) == 0 {
		return marked, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT event_id FROM event_bookmarks WHERE user_id = $1 AND event_id = ANY($2)`,
		userID, eventIDs)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, mapError(err)
		}
		marked[id] = true
	}
	return marked, mapError(rows.Err())
}

const bookmarkColumns = `e.display_id, e.title, e.description, e.organizer, e.website_url,
	e.kind, e.format, e.origin, e.country_code, e.city,
	e.track, e.prize_pool, e.prize_currency, e.team_size_min, e.team_size_max, e.start_at, e.end_at,
	(p.id IS NOT NULL) AS joined`

const bookmarkFrom = `FROM event_bookmarks b
	JOIN events e ON e.id = b.event_id
	LEFT JOIN event_participants p
		ON p.event_id = e.id AND p.user_id = $1 AND p.participation_status = 'ASSIGNED'
	WHERE b.user_id = $1 AND e.published_at IS NOT NULL AND e.archived_at IS NULL`

func (r *Bookmarks) List(ctx context.Context, userID uuid.UUID, page models.Page,
	now time.Time) ([]dto.CatalogEvent, int64, error) {
	args := []any{userID}

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) `+bookmarkFrom, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `SELECT `+bookmarkColumns+` `+bookmarkFrom+`
		ORDER BY b.created_at DESC
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.CatalogEvent, 0, page.Limit())
	for rows.Next() {
		var c dto.CatalogEvent
		if err := rows.Scan(&c.ID, &c.Title, &c.Description, &c.Organizer, &c.WebsiteURL,
			&c.Kind, &c.Format, &c.Origin, &c.CountryCode, &c.City,
			&c.Track, &c.PrizePool, &c.PrizeCurrency, &c.TeamSizeMin, &c.TeamSizeMax,
			&c.StartAt, &c.EndAt, &c.Joined); err != nil {
			return nil, 0, mapError(err)
		}
		c.State = eventState(c.StartAt, c.EndAt, now)
		c.EffectiveFormat = c.Format
		c.OfflineStages = []dto.CatalogPlace{}
		items = append(items, c)
	}
	return items, total, mapError(rows.Err())
}

func eventState(start, end, now time.Time) models.EventState {
	switch {
	case now.Before(start):
		return models.EventUpcoming
	case now.After(end):
		return models.EventFinished
	default:
		return models.EventActive
	}
}
