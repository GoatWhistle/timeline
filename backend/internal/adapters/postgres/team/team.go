package team

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
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

type TeamSummaryRow struct {
	Team    models.Team
	Lead    dto.UserSummary
	MyState string
}

func (r *Teams) SummariesForUser(ctx context.Context, userID uuid.UUID) ([]TeamSummaryRow, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT t.id, t.display_id, t.name, t.lead_user_id, t.created_at, t.updated_at,
		       lead.display_id, lead.first_name, lead.middle_name, lead.last_name,
		       lead.nickname, lead.email, lead.is_active, lead.locale,
		       m.state
		FROM teams t
		JOIN team_members m ON m.team_id = t.id
		JOIN users lead ON lead.id = t.lead_user_id
		WHERE m.user_id = $1 AND m.state IN ('INVITED', 'ACTIVE')
		ORDER BY lower(t.name), t.created_at`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]TeamSummaryRow, 0, 8)
	for rows.Next() {
		var (
			row       TeamSummaryRow
			leadScope string
		)
		if err := rows.Scan(&row.Team.ID, &row.Team.DisplayID, &row.Team.Name,
			&row.Team.LeadUserID, &row.Team.CreatedAt, &row.Team.UpdatedAt,
			&row.Lead.ID, &row.Lead.FirstName, &row.Lead.MiddleName, &row.Lead.LastName,
			&row.Lead.Nickname, &row.Lead.Email, &row.Lead.IsActive, &leadScope,
			&row.MyState); err != nil {
			return nil, mapError(err)
		}
		row.Lead.Fill(leadScope)
		items = append(items, row)
	}
	return items, mapError(rows.Err())
}
