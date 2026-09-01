package team

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Members struct{ db *postgres.DB }

func NewMembers(db *postgres.DB) *Members { return &Members{db: db} }

const memberColumns = `id, display_id, team_id, user_id, state, invited_at, joined_at, left_at,
	created_at, updated_at`

func scanMember(row pgx.Row) (*models.TeamMember, error) {
	var m models.TeamMember
	if err := row.Scan(&m.ID, &m.DisplayID, &m.TeamID, &m.UserID, &m.State,
		&m.InvitedAt, &m.JoinedAt, &m.LeftAt, &m.CreatedAt, &m.UpdatedAt); err != nil {
		return nil, mapError(err)
	}
	return &m, nil
}

func (r *Members) AddLead(ctx context.Context, teamID, userID uuid.UUID) (*models.TeamMember, error) {
	return scanMember(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO team_members (team_id, user_id, state, joined_at)
		VALUES ($1, $2, 'ACTIVE', now())
		RETURNING `+memberColumns, teamID, userID))
}

func (r *Members) Invite(ctx context.Context, teamID, userID uuid.UUID) (*models.TeamMember, error) {
	return scanMember(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO team_members (team_id, user_id, state)
		VALUES ($1, $2, 'INVITED')
		ON CONFLICT (team_id, user_id) DO UPDATE
			SET state = 'INVITED', joined_at = NULL, left_at = NULL, invited_at = now()
			WHERE team_members.state = 'LEFT'
		RETURNING `+memberColumns, teamID, userID))
}

func (r *Members) Accept(ctx context.Context, id uuid.UUID) (*models.TeamMember, error) {
	return scanMember(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE team_members SET state = 'ACTIVE', joined_at = now(), left_at = NULL
		WHERE id = $1 AND state = 'INVITED'
		RETURNING `+memberColumns, id))
}

func (r *Members) Leave(ctx context.Context, id uuid.UUID) (*models.TeamMember, error) {
	return scanMember(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE team_members SET state = 'LEFT', joined_at = NULL, left_at = now()
		WHERE id = $1 AND state IN ('INVITED', 'ACTIVE')
		RETURNING `+memberColumns, id))
}

func (r *Members) GetByID(ctx context.Context, id uuid.UUID) (*models.TeamMember, error) {
	return scanMember(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+memberColumns+` FROM team_members WHERE id = $1`, id))
}

func (r *Members) GetByTeamUser(ctx context.Context, teamID, userID uuid.UUID) (*models.TeamMember, error) {
	return scanMember(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+memberColumns+` FROM team_members WHERE team_id = $1 AND user_id = $2`, teamID, userID))
}

func (r *Members) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM team_members WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("team member not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Members) ListActiveUserIDs(ctx context.Context, teamID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT user_id FROM team_members WHERE team_id = $1 AND state = 'ACTIVE'`, teamID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	ids := make([]uuid.UUID, 0, 8)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, mapError(err)
		}
		ids = append(ids, id)
	}
	return ids, mapError(rows.Err())
}

func (r *Members) List(ctx context.Context, teamID uuid.UUID) ([]dto.TeamMemberResponse, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT m.display_id, t.display_id, m.state, m.invited_at, m.joined_at, m.left_at,
		       u.display_id, u.first_name, u.middle_name, u.last_name, u.nickname, u.email, u.is_active,
		       t.lead_user_id = m.user_id
		FROM team_members m
		JOIN teams t ON t.id = m.team_id
		JOIN users u ON u.id = m.user_id
		WHERE m.team_id = $1
		ORDER BY t.lead_user_id = m.user_id DESC, lower(u.last_name), lower(u.first_name)`, teamID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.TeamMemberResponse, 0, 8)
	for rows.Next() {
		var item dto.TeamMemberResponse
		if err := rows.Scan(&item.ID, &item.TeamID, &item.State, &item.InvitedAt,
			&item.JoinedAt, &item.LeftAt,
			&item.User.ID, &item.User.FirstName, &item.User.MiddleName, &item.User.LastName,
			&item.User.Nickname, &item.User.Email, &item.User.IsActive, &item.IsLead); err != nil {
			return nil, mapError(err)
		}
		item.User.Fill(locale.Default)
		items = append(items, item)
	}
	return items, mapError(rows.Err())
}
