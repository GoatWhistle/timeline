package team

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Entries struct{ db *postgres.DB }

func NewEntries(db *postgres.DB) *Entries { return &Entries{db: db} }

const entryColumns = `id, display_id, team_id, event_id, entered_at, created_at, updated_at`

func scanEntry(row pgx.Row) (*models.TeamEventEntry, error) {
	var e models.TeamEventEntry
	if err := row.Scan(&e.ID, &e.DisplayID, &e.TeamID, &e.EventID,
		&e.EnteredAt, &e.CreatedAt, &e.UpdatedAt); err != nil {
		return nil, mapError(err)
	}
	return &e, nil
}

func (r *Entries) Create(ctx context.Context, teamID, eventID uuid.UUID) (*models.TeamEventEntry, error) {
	return scanEntry(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO team_event_entries (team_id, event_id)
		VALUES ($1, $2)
		RETURNING `+entryColumns, teamID, eventID))
}

func (r *Entries) GetByTeamEvent(ctx context.Context, teamID, eventID uuid.UUID) (*models.TeamEventEntry, error) {
	return scanEntry(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+entryColumns+` FROM team_event_entries WHERE team_id = $1 AND event_id = $2`,
		teamID, eventID))
}

func (r *Entries) GetByID(ctx context.Context, id uuid.UUID) (*models.TeamEventEntry, error) {
	return scanEntry(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+entryColumns+` FROM team_event_entries WHERE id = $1`, id))
}

func (r *Entries) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM team_event_entries WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("team event entry not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Entries) ListEventIDs(ctx context.Context, teamID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT event_id FROM team_event_entries WHERE team_id = $1 ORDER BY entered_at`, teamID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	ids := make([]uuid.UUID, 0, 4)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, mapError(err)
		}
		ids = append(ids, id)
	}
	return ids, mapError(rows.Err())
}

func (r *Entries) Standing(ctx context.Context, entryID, eventID uuid.UUID) (models.TeamEventStanding, error) {
	var standing models.TeamEventStanding
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT
			count(tp.id),
			count(*) FILTER (WHERE p.participation_status = 'ASSIGNED'),
			count(*) FILTER (WHERE p.participation_status = 'ASSIGNED' AND s.status = 'DONE'),
			max(e.team_size_min),
			max(e.team_size_max)
		FROM events e
		LEFT JOIN team_event_participants tp ON tp.entry_id = $1
		LEFT JOIN team_members m ON m.id = tp.member_id
		LEFT JOIN event_participants p ON p.user_id = m.user_id AND p.event_id = e.id
		LEFT JOIN registration_statuses s ON s.participant_id = p.id
		WHERE e.id = $2`, entryID, eventID).
		Scan(&standing.RosterSize, &standing.AssignedMembers,
			&standing.RegisteredCount, &standing.TeamSizeMin, &standing.TeamSizeMax)
	if err != nil {
		return standing, mapError(err)
	}
	return standing, nil
}
