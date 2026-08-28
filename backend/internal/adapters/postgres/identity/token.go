package identity

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Tokens struct{ db *postgres.DB }

func NewTokens(db *postgres.DB) *Tokens { return &Tokens{db: db} }

const tokenColumns = `id, user_id, purpose, token_hash, target_email, expires_at, consumed_at, created_at`

func scanToken(row pgx.Row) (*models.OneTimeToken, error) {
	var t models.OneTimeToken
	err := row.Scan(&t.ID, &t.UserID, &t.Purpose, &t.TokenHash, &t.TargetEmail,
		&t.ExpiresAt, &t.ConsumedAt, &t.CreatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &t, nil
}

func (r *Tokens) Create(ctx context.Context, t *models.OneTimeToken) (*models.OneTimeToken, error) {
	return scanToken(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO one_time_tokens (user_id, purpose, token_hash, target_email, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+tokenColumns,
		t.UserID, t.Purpose, t.TokenHash, t.TargetEmail, t.ExpiresAt))
}

func (r *Tokens) Consume(ctx context.Context, hash string, purpose models.TokenPurpose, now time.Time) (*models.OneTimeToken, error) {
	return scanToken(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE one_time_tokens SET consumed_at = $3
		WHERE token_hash = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > $3
		RETURNING `+tokenColumns, hash, purpose, now))
}

func (r *Tokens) InvalidateForUser(ctx context.Context, userID uuid.UUID, purpose models.TokenPurpose) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE one_time_tokens SET consumed_at = now()
		WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`, userID, purpose)
	return mapError(err)
}

func (r *Tokens) DeleteExpired(ctx context.Context, before time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `DELETE FROM one_time_tokens WHERE expires_at < $1`, before)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}
