package team

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Rosters struct{ db *postgres.DB }

func NewRosters(db *postgres.DB) *Rosters { return &Rosters{db: db} }

const rosterColumns = `id, display_id, entry_id, member_id, team_id, added_at, created_at, updated_at`

func scanRoster(row pgx.Row) (*models.TeamEventRosterEntry, error) {
	var r models.TeamEventRosterEntry
	if err := row.Scan(&r.ID, &r.DisplayID, &r.EntryID, &r.MemberID, &r.TeamID,
		&r.AddedAt, &r.CreatedAt, &r.UpdatedAt); err != nil {
		return nil, mapError(err)
	}
	return &r, nil
}

func (r *Rosters) Add(ctx context.Context, entryID, memberID, teamID uuid.UUID,
) (*models.TeamEventRosterEntry, error) {
	return scanRoster(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO team_event_participants (entry_id, member_id, team_id)
		VALUES ($1, $2, $3)
		RETURNING `+rosterColumns, entryID, memberID, teamID))
}

func (r *Rosters) Remove(ctx context.Context, entryID, memberID uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM team_event_participants WHERE entry_id = $1 AND member_id = $2`,
		entryID, memberID)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.NewNotFound("the member is not on this event roster")
	}
	return nil
}

func (r *Rosters) Contains(ctx context.Context, entryID, memberID uuid.UUID) (bool, error) {
	var present bool
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM team_event_participants WHERE entry_id = $1 AND member_id = $2)`,
		entryID, memberID).Scan(&present)
	if err != nil {
		return false, mapError(err)
	}
	return present, nil
}

func (r *Rosters) CountForUpdate(ctx context.Context, entryID uuid.UUID) (int, error) {
	var count int
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(*) FROM team_event_participants
		WHERE entry_id = (SELECT id FROM team_event_entries WHERE id = $1 FOR UPDATE)`,
		entryID).Scan(&count)
	if err != nil {
		return 0, mapError(err)
	}
	return count, nil
}

func (r *Rosters) List(ctx context.Context, entryID uuid.UUID, eventID uuid.UUID,
) ([]dto.TeamRosterMemberResponse, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT tp.display_id, m.display_id, m.state,
		       u.display_id, u.first_name, u.middle_name, u.last_name, u.nickname, u.email, u.is_active,
		       t.lead_user_id = m.user_id,
		       p.participation_status IS NOT DISTINCT FROM 'ASSIGNED',
		       s.status
		FROM team_event_participants tp
		JOIN team_members m ON m.id = tp.member_id
		JOIN teams t ON t.id = tp.team_id
		JOIN users u ON u.id = m.user_id
		LEFT JOIN event_participants p ON p.user_id = m.user_id AND p.event_id = $2
		LEFT JOIN registration_statuses s ON s.participant_id = p.id
		WHERE tp.entry_id = $1
		ORDER BY t.lead_user_id = m.user_id DESC, lower(u.last_name), lower(u.first_name)`,
		entryID, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.TeamRosterMemberResponse, 0, 8)
	for rows.Next() {
		var item dto.TeamRosterMemberResponse
		if err := rows.Scan(&item.ID, &item.MemberID, &item.State,
			&item.User.ID, &item.User.FirstName, &item.User.MiddleName, &item.User.LastName,
			&item.User.Nickname, &item.User.Email, &item.User.IsActive,
			&item.IsLead, &item.Assigned, &item.RegistrationStatus); err != nil {
			return nil, mapError(err)
		}
		item.User.Fill(locale.Default)
		items = append(items, item)
	}
	return items, mapError(rows.Err())
}
