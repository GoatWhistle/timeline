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

type Invites struct{ db *postgres.DB }

func NewInvites(db *postgres.DB) *Invites { return &Invites{db: db} }

const inviteColumns = `id, display_id, normalized_email, created_by_user_id,
	(SELECT u.display_id FROM users u WHERE u.id = created_by_user_id), token_hash, expires_at,
	accepted_at, revoked_at, created_at`

func scanInvite(row pgx.Row) (*models.Invite, error) {
	var i models.Invite
	err := row.Scan(&i.ID, &i.DisplayID, &i.NormalizedEmail, &i.CreatedByUserID, &i.CreatedByUser,
		&i.TokenHash, &i.ExpiresAt,
		&i.AcceptedAt, &i.RevokedAt, &i.CreatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &i, nil
}

func (r *Invites) Create(ctx context.Context, i *models.Invite) (*models.Invite, error) {
	return scanInvite(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO invites (normalized_email, created_by_user_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING `+inviteColumns,
		NormalizeEmail(i.NormalizedEmail), i.CreatedByUserID, i.TokenHash, i.ExpiresAt))
}

func (r *Invites) GetByID(ctx context.Context, id uuid.UUID) (*models.Invite, error) {
	return scanInvite(r.db.Q(ctx).QueryRow(ctx, `SELECT `+inviteColumns+` FROM invites WHERE id = $1`, id))
}

func (r *Invites) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM invites WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("invite not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Invites) GetByHash(ctx context.Context, hash string) (*models.Invite, error) {
	return scanInvite(r.db.Q(ctx).QueryRow(ctx, `SELECT `+inviteColumns+` FROM invites WHERE token_hash = $1`, hash))
}

func (r *Invites) LockByEmail(ctx context.Context, email string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, NormalizeEmail(email))
	return mapError(err)
}

func (r *Invites) RevokePendingByEmail(ctx context.Context, email string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE invites SET revoked_at = now()
		WHERE normalized_email = $1 AND accepted_at IS NULL AND revoked_at IS NULL`, NormalizeEmail(email))
	return mapError(err)
}

func (r *Invites) Revoke(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE invites SET revoked_at = now()
		WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Invites) MarkAccepted(ctx context.Context, id uuid.UUID, now time.Time) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE invites SET accepted_at = $2
		WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > $2`, id, now)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.NewConflict("invite_not_usable", "the invite has already been used or revoked")
	}
	return nil
}

func (r *Invites) List(ctx context.Context, page models.Page) ([]models.Invite, int64, error) {
	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) FROM invites`).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+inviteColumns+` FROM invites
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`, page.Limit(), page.Offset())
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Invite, 0, page.Limit())
	for rows.Next() {
		var i models.Invite
		if err := rows.Scan(&i.ID, &i.DisplayID, &i.NormalizedEmail, &i.CreatedByUserID, &i.CreatedByUser,
			&i.TokenHash, &i.ExpiresAt,
			&i.AcceptedAt, &i.RevokedAt, &i.CreatedAt); err != nil {
			return nil, 0, mapError(err)
		}
		items = append(items, i)
	}
	return items, total, mapError(rows.Err())
}
