package identity

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Sessions struct{ db *postgres.DB }

func NewSessions(db *postgres.DB) *Sessions { return &Sessions{db: db} }

const sessionColumns = `id, display_id, user_id, family_id, refresh_token_hash, user_agent, ip,
	label, expires_at, last_used_at, revoked_at, created_at`

func scanSession(row pgx.Row) (*models.Session, error) {
	var s models.Session
	err := row.Scan(&s.ID, &s.DisplayID, &s.UserID, &s.FamilyID, &s.RefreshTokenHash, &s.UserAgent, &s.IP,
		&s.Label, &s.ExpiresAt, &s.LastUsedAt, &s.RevokedAt, &s.CreatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &s, nil
}

func (r *Sessions) Create(ctx context.Context, s *models.Session) (*models.Session, error) {
	return scanSession(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO sessions (user_id, family_id, refresh_token_hash, user_agent, ip, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+sessionColumns,
		s.UserID, s.FamilyID, s.RefreshTokenHash, s.UserAgent, s.IP, s.ExpiresAt))
}

func (r *Sessions) GetByHash(ctx context.Context, hash string) (*models.Session, error) {
	return scanSession(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+sessionColumns+` FROM sessions WHERE refresh_token_hash = $1`, hash))
}

func (r *Sessions) Revoke(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, id)
	return mapError(err)
}

func (r *Sessions) RevokeFamily(ctx context.Context, familyID uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL`, familyID)
	return mapError(err)
}

func (r *Sessions) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, userID)
	return mapError(err)
}

func (r *Sessions) Rotate(ctx context.Context, current *models.Session, next *models.Session) (*models.Session, error) {
	if err := r.Revoke(ctx, current.ID); err != nil {
		return nil, err
	}
	next.FamilyID = current.FamilyID
	return r.Create(ctx, next)
}

func (r *Sessions) ListActiveForUser(ctx context.Context, userID uuid.UUID, now time.Time) ([]models.Session, error) {
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT `+sessionColumns+` FROM sessions
		 WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > $2
		 ORDER BY coalesce(last_used_at, created_at) DESC, created_at DESC`, userID, now)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Session, 0, 8)
	for rows.Next() {
		s, err := scanSession(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *s)
	}
	return items, mapError(rows.Err())
}

func (r *Sessions) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM sessions WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("session not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Sessions) UpdateLabel(ctx context.Context, userID, id uuid.UUID,
	label *string) (*models.Session, error) {
	return scanSession(r.db.Q(ctx).QueryRow(ctx,
		`UPDATE sessions SET label = $3 WHERE id = $1 AND user_id = $2
		 RETURNING `+sessionColumns, id, userID, label))
}

func (r *Sessions) GetByID(ctx context.Context, id uuid.UUID) (*models.Session, error) {
	return scanSession(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+sessionColumns+` FROM sessions WHERE id = $1`, id))
}
