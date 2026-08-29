package participation

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Participants struct{ db *postgres.DB }

func NewParticipants(db *postgres.DB) *Participants { return &Participants{db: db} }

const participantColumns = `id, event_id, user_id, team_role, participation_status,
	assignment_version, assigned_at, removed_at, created_at, updated_at`

func scanParticipant(row pgx.Row) (*models.EventParticipant, error) {
	var p models.EventParticipant
	err := row.Scan(&p.ID, &p.EventID, &p.UserID, &p.TeamRole, &p.ParticipationStatus,
		&p.AssignmentVersion, &p.AssignedAt, &p.RemovedAt, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &p, nil
}

func (r *Participants) Create(ctx context.Context, eventID, userID uuid.UUID, teamRole *string) (*models.EventParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO event_participants (event_id, user_id, team_role)
		VALUES ($1, $2, $3)
		RETURNING `+participantColumns, eventID, userID, teamRole))
}

func (r *Participants) GetByID(ctx context.Context, id uuid.UUID) (*models.EventParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+participantColumns+` FROM event_participants WHERE id = $1`, id))
}

func (r *Participants) GetForUpdate(ctx context.Context, id uuid.UUID) (*models.EventParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+participantColumns+` FROM event_participants WHERE id = $1 FOR UPDATE`, id))
}

func (r *Participants) GetByEventUser(ctx context.Context, eventID, userID uuid.UUID) (*models.EventParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+participantColumns+` FROM event_participants WHERE event_id = $1 AND user_id = $2`,
		eventID, userID))
}

func (r *Participants) Reactivate(ctx context.Context, id uuid.UUID, teamRole *string) (*models.EventParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE event_participants SET
			participation_status = 'ASSIGNED',
			assignment_version = assignment_version + 1,
			assigned_at = now(),
			removed_at = NULL,
			team_role = $2
		WHERE id = $1 AND participation_status = 'REMOVED'
		RETURNING `+participantColumns, id, teamRole))
}

func (r *Participants) Remove(ctx context.Context, id uuid.UUID) (*models.EventParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE event_participants SET participation_status = 'REMOVED', removed_at = now()
		WHERE id = $1 AND participation_status = 'ASSIGNED'
		RETURNING `+participantColumns, id))
}

func (r *Participants) UpdateTeamRole(ctx context.Context, id uuid.UUID, teamRole *string) (*models.EventParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE event_participants SET team_role = $2 WHERE id = $1
		RETURNING `+participantColumns, id, teamRole))
}

func (r *Participants) ListAssigned(ctx context.Context, eventID uuid.UUID) ([]models.EventParticipant, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+participantColumns+` FROM event_participants
		WHERE event_id = $1 AND participation_status = 'ASSIGNED'
		ORDER BY assigned_at`, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.EventParticipant, 0, 16)
	for rows.Next() {
		var p models.EventParticipant
		if err := rows.Scan(&p.ID, &p.EventID, &p.UserID, &p.TeamRole, &p.ParticipationStatus,
			&p.AssignmentVersion, &p.AssignedAt, &p.RemovedAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, p)
	}
	return items, mapError(rows.Err())
}

func (r *Participants) List(ctx context.Context, eventID uuid.UUID, filter models.ParticipantFilter, page models.Page) ([]models.ParticipantResponse, int64, error) {
	conds := []string{"p.event_id = $1"}
	args := []any{eventID}

	if !filter.IncludeRemoved {
		conds = append(conds, "p.participation_status = 'ASSIGNED'")
	}
	if filter.TeamRole != "" {
		args = append(args, filter.TeamRole)
		conds = append(conds, "p.team_role = $"+itoa(len(args)))
	}
	if filter.RegistrationStatus != "" {
		args = append(args, string(filter.RegistrationStatus))
		conds = append(conds, "s.status = $"+itoa(len(args)))
	}
	if filter.Search != "" {
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
		conds = append(conds, "(lower(u.first_name) LIKE $"+itoa(len(args))+
			" OR lower(u.last_name) LIKE $"+itoa(len(args))+" OR u.email LIKE $"+itoa(len(args))+")")
	}
	where := "WHERE " + strings.Join(conds, " AND ")

	from := `
		FROM event_participants p
		JOIN users u ON u.id = p.user_id
		LEFT JOIN registration_statuses s ON s.participant_id = p.id `

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) `+from+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT p.id, p.event_id, p.team_role, p.participation_status, p.assignment_version,
		       p.assigned_at, p.removed_at,
		       u.id, u.first_name, u.middle_name, u.last_name, u.nickname, u.email, u.is_active,
		       s.id, s.status, s.todo_cycle, s.registered_at, s.note `+from+where+`
		ORDER BY lower(u.last_name), lower(u.first_name)
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.ParticipantResponse, 0, page.Limit())
	for rows.Next() {
		var (
			item         models.ParticipantResponse
			statusID     *uuid.UUID
			statusValue  *models.RegistrationStatusValue
			todoCycle    *int
			registeredAt *time.Time
			note         *string
		)
		if err := rows.Scan(&item.ID, &item.EventID, &item.TeamRole, &item.ParticipationStatus,
			&item.AssignmentVersion, &item.AssignedAt, &item.RemovedAt,
			&item.User.ID, &item.User.FirstName, &item.User.MiddleName, &item.User.LastName,
			&item.User.Nickname, &item.User.Email, &item.User.IsActive,
			&statusID, &statusValue, &todoCycle, &registeredAt, &note); err != nil {
			return nil, 0, mapError(err)
		}
		if statusID != nil && statusValue != nil && todoCycle != nil {
			item.RegistrationStatus = &models.RegistrationStatusShort{
				ID:           *statusID,
				Status:       *statusValue,
				TodoCycle:    *todoCycle,
				RegisteredAt: registeredAt,
				Note:         note,
			}
		}
		item.User.Fill(locale.Default)
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}
