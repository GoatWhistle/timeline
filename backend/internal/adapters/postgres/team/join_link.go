package team

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type JoinLinks struct{ db *postgres.DB }

func NewJoinLinks(db *postgres.DB) *JoinLinks { return &JoinLinks{db: db} }

const joinLinkColumns = `id, display_id, team_id, token_hash, created_by, expires_at, revoked_at,
	created_at, updated_at`

func scanJoinLink(row pgx.Row) (*models.TeamJoinLink, error) {
	var l models.TeamJoinLink
	if err := row.Scan(&l.ID, &l.DisplayID, &l.TeamID, &l.TokenHash, &l.CreatedBy,
		&l.ExpiresAt, &l.RevokedAt, &l.CreatedAt, &l.UpdatedAt); err != nil {
		return nil, mapError(err)
	}
	return &l, nil
}

func (r *JoinLinks) Create(ctx context.Context, teamID, createdBy uuid.UUID,
	tokenHash string, expiresAt time.Time) (*models.TeamJoinLink, error) {
	return scanJoinLink(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO team_join_links (team_id, token_hash, created_by, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING `+joinLinkColumns, teamID, tokenHash, createdBy, expiresAt))
}

func (r *JoinLinks) Active(ctx context.Context, teamID uuid.UUID) (*models.TeamJoinLink, error) {
	return scanJoinLink(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+joinLinkColumns+` FROM team_join_links
		 WHERE team_id = $1 AND revoked_at IS NULL`, teamID))
}

func (r *JoinLinks) ByTokenHash(ctx context.Context, tokenHash string) (*models.TeamJoinLink, error) {
	return scanJoinLink(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+joinLinkColumns+` FROM team_join_links WHERE token_hash = $1`, tokenHash))
}

func (r *JoinLinks) RevokeActive(ctx context.Context, teamID uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE team_join_links SET revoked_at = now()
		 WHERE team_id = $1 AND revoked_at IS NULL`, teamID)
	return mapError(err)
}
