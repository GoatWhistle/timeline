package identity

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type CalendarFeeds struct{ db *postgres.DB }

func NewCalendarFeeds(db *postgres.DB) *CalendarFeeds { return &CalendarFeeds{db: db} }

const calendarFeedColumns = `id, user_id, token_hash, created_at, last_used_at, revoked_at`

func scanCalendarFeed(row pgx.Row) (*models.CalendarFeedToken, error) {
	var t models.CalendarFeedToken
	err := row.Scan(&t.ID, &t.UserID, &t.TokenHash, &t.CreatedAt, &t.LastUsedAt, &t.RevokedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &t, nil
}

func (r *CalendarFeeds) Create(ctx context.Context, userID uuid.UUID,
	hash string) (*models.CalendarFeedToken, error) {
	return scanCalendarFeed(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO calendar_feed_tokens (user_id, token_hash)
		VALUES ($1, $2)
		RETURNING `+calendarFeedColumns, userID, hash))
}

func (r *CalendarFeeds) GetActiveByUser(ctx context.Context,
	userID uuid.UUID) (*models.CalendarFeedToken, error) {
	return scanCalendarFeed(r.db.Q(ctx).QueryRow(ctx, `
		SELECT `+calendarFeedColumns+`
		FROM calendar_feed_tokens
		WHERE user_id = $1 AND revoked_at IS NULL`, userID))
}

func (r *CalendarFeeds) GetActiveByHash(ctx context.Context,
	hash string) (*models.CalendarFeedToken, error) {
	return scanCalendarFeed(r.db.Q(ctx).QueryRow(ctx, `
		SELECT `+calendarFeedColumns+`
		FROM calendar_feed_tokens
		WHERE token_hash = $1 AND revoked_at IS NULL`, hash))
}

func (r *CalendarFeeds) RevokeAllForUser(ctx context.Context, userID uuid.UUID) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE calendar_feed_tokens SET revoked_at = now()
		WHERE user_id = $1 AND revoked_at IS NULL`, userID)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

func (r *CalendarFeeds) TouchLastUsed(ctx context.Context, id uuid.UUID, now time.Time) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE calendar_feed_tokens SET last_used_at = $2 WHERE id = $1`, id, now)
	return mapError(err)
}
