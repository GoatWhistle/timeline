package identity

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (r *Users) SetSessionIdleDays(ctx context.Context, id uuid.UUID,
	idleDays *int) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx,
		`UPDATE users SET session_idle_days = $2 WHERE id = $1 RETURNING `+userColumns, id, idleDays))
}

func (r *Sessions) RevokeIdle(ctx context.Context, now time.Time, limit int) (int, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		WITH ranked AS (
			SELECT s.id,
			       row_number() OVER (
			           PARTITION BY s.user_id
			           ORDER BY coalesce(s.last_used_at, s.created_at) DESC, s.created_at DESC
			       ) AS recency,
			       coalesce(s.last_used_at, s.created_at) AS idle_since,
			       u.session_idle_days
			FROM sessions s
			JOIN users u ON u.id = s.user_id
			WHERE s.revoked_at IS NULL
			  AND u.session_idle_days IS NOT NULL
		)
		UPDATE sessions SET revoked_at = $1
		WHERE id IN (
			SELECT id FROM ranked
			WHERE recency > 1
			  AND idle_since <= $1::timestamptz - make_interval(days => session_idle_days)
			LIMIT $2
		)`, now, limit)
	if err != nil {
		return 0, mapError(err)
	}
	return int(tag.RowsAffected()), nil
}
