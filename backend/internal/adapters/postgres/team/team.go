package team

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Teams struct{ db *postgres.DB }

func NewTeams(db *postgres.DB) *Teams { return &Teams{db: db} }

const teamColumns = `id, display_id, name, lead_user_id, created_at, updated_at`

func scanTeam(row pgx.Row) (*models.Team, error) {
	var t models.Team
	if err := row.Scan(&t.ID, &t.DisplayID, &t.Name, &t.LeadUserID, &t.CreatedAt, &t.UpdatedAt); err != nil {
		return nil, mapError(err)
	}
	return &t, nil
}

func (r *Teams) Create(ctx context.Context, name string, leadUserID uuid.UUID) (*models.Team, error) {
	return scanTeam(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO teams (name, lead_user_id)
		VALUES ($1, $2)
		RETURNING `+teamColumns, name, leadUserID))
}

func (r *Teams) Rename(ctx context.Context, id uuid.UUID, name string) (*models.Team, error) {
	return scanTeam(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE teams SET name = $2 WHERE id = $1
		RETURNING `+teamColumns, id, name))
}

func (r *Teams) GetByID(ctx context.Context, id uuid.UUID) (*models.Team, error) {
	return scanTeam(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+teamColumns+` FROM teams WHERE id = $1`, id))
}

func (r *Teams) GetForUpdate(ctx context.Context, id uuid.UUID) (*models.Team, error) {
	return scanTeam(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+teamColumns+` FROM teams WHERE id = $1 FOR UPDATE`, id))
}

func (r *Teams) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx, `SELECT id FROM teams WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("team not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Teams) ListForUser(ctx context.Context, userID uuid.UUID) ([]models.Team, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT t.id, t.display_id, t.name, t.lead_user_id, t.created_at, t.updated_at
		FROM teams t
		JOIN team_members m ON m.team_id = t.id
		WHERE m.user_id = $1 AND m.state IN ('INVITED', 'ACTIVE')
		ORDER BY lower(t.name), t.created_at`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Team, 0, 8)
	for rows.Next() {
		var t models.Team
		if err := rows.Scan(&t.ID, &t.DisplayID, &t.Name, &t.LeadUserID,
			&t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, t)
	}
	return items, mapError(rows.Err())
}
