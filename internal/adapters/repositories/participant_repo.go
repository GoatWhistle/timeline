package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// ParticipantRepository — доступ к назначениям участников.
type ParticipantRepository struct{ db *DB }

// NewParticipantRepository создаёт репозиторий участников.
func NewParticipantRepository(db *DB) *ParticipantRepository { return &ParticipantRepository{db: db} }

const participantColumns = `id, hackathon_id, user_id, team_role, participation_status,
	assignment_version, assigned_at, removed_at, created_at, updated_at`

func scanParticipant(row pgx.Row) (*models.HackathonParticipant, error) {
	var p models.HackathonParticipant
	err := row.Scan(&p.ID, &p.HackathonID, &p.UserID, &p.TeamRole, &p.ParticipationStatus,
		&p.AssignmentVersion, &p.AssignedAt, &p.RemovedAt, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &p, nil
}

// Create добавляет участника на хакатон.
func (r *ParticipantRepository) Create(ctx context.Context, hackathonID, userID uuid.UUID, teamRole string) (*models.HackathonParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO hackathon_participants (hackathon_id, user_id, team_role)
		VALUES ($1, $2, $3)
		RETURNING `+participantColumns, hackathonID, userID, strings.TrimSpace(teamRole)))
}

// GetByID читает участника по идентификатору.
func (r *ParticipantRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.HackathonParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+participantColumns+` FROM hackathon_participants WHERE id = $1`, id))
}

// GetForUpdate читает участника и блокирует строку до конца транзакции.
func (r *ParticipantRepository) GetForUpdate(ctx context.Context, id uuid.UUID) (*models.HackathonParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+participantColumns+` FROM hackathon_participants WHERE id = $1 FOR UPDATE`, id))
}

// GetByHackathonUser читает участие конкретного пользователя.
func (r *ParticipantRepository) GetByHackathonUser(ctx context.Context, hackathonID, userID uuid.UUID) (*models.HackathonParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+participantColumns+` FROM hackathon_participants WHERE hackathon_id = $1 AND user_id = $2`,
		hackathonID, userID))
}

// Reactivate возвращает участие в ASSIGNED и увеличивает версию назначения.
func (r *ParticipantRepository) Reactivate(ctx context.Context, id uuid.UUID, teamRole string) (*models.HackathonParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE hackathon_participants SET
			participation_status = 'ASSIGNED',
			assignment_version = assignment_version + 1,
			assigned_at = now(),
			removed_at = NULL,
			team_role = $2
		WHERE id = $1 AND participation_status = 'REMOVED'
		RETURNING `+participantColumns, id, strings.TrimSpace(teamRole)))
}

// Remove переводит участие в REMOVED.
func (r *ParticipantRepository) Remove(ctx context.Context, id uuid.UUID) (*models.HackathonParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE hackathon_participants SET participation_status = 'REMOVED', removed_at = now()
		WHERE id = $1 AND participation_status = 'ASSIGNED'
		RETURNING `+participantColumns, id))
}

// UpdateTeamRole меняет функцию участника.
func (r *ParticipantRepository) UpdateTeamRole(ctx context.Context, id uuid.UUID, teamRole string) (*models.HackathonParticipant, error) {
	return scanParticipant(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE hackathon_participants SET team_role = $2 WHERE id = $1
		RETURNING `+participantColumns, id, strings.TrimSpace(teamRole)))
}

// ListAssigned возвращает всех назначенных участников хакатона.
func (r *ParticipantRepository) ListAssigned(ctx context.Context, hackathonID uuid.UUID) ([]models.HackathonParticipant, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+participantColumns+` FROM hackathon_participants
		WHERE hackathon_id = $1 AND participation_status = 'ASSIGNED'
		ORDER BY assigned_at`, hackathonID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.HackathonParticipant, 0, 16)
	for rows.Next() {
		var p models.HackathonParticipant
		if err := rows.Scan(&p.ID, &p.HackathonID, &p.UserID, &p.TeamRole, &p.ParticipationStatus,
			&p.AssignmentVersion, &p.AssignedAt, &p.RemovedAt, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, p)
	}
	return items, mapError(rows.Err())
}

// List возвращает страницу состава с данными пользователя и статусом регистрации.
func (r *ParticipantRepository) List(ctx context.Context, hackathonID uuid.UUID, filter models.ParticipantFilter, page models.Page) ([]models.ParticipantResponse, int64, error) {
	conds := []string{"p.hackathon_id = $1"}
	args := []any{hackathonID}

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
		conds = append(conds, "(lower(u.display_name) LIKE $"+itoa(len(args))+" OR u.email LIKE $"+itoa(len(args))+")")
	}
	where := "WHERE " + strings.Join(conds, " AND ")

	from := `
		FROM hackathon_participants p
		JOIN users u ON u.id = p.user_id
		LEFT JOIN registration_statuses s ON s.participant_id = p.id `

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) `+from+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT p.id, p.hackathon_id, p.team_role, p.participation_status, p.assignment_version,
		       p.assigned_at, p.removed_at,
		       u.id, u.display_name, u.email, u.is_active,
		       s.id, s.status, s.todo_cycle, s.registered_at, s.note `+from+where+`
		ORDER BY u.display_name
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
		if err := rows.Scan(&item.ID, &item.HackathonID, &item.TeamRole, &item.ParticipationStatus,
			&item.AssignmentVersion, &item.AssignedAt, &item.RemovedAt,
			&item.User.ID, &item.User.DisplayName, &item.User.Email, &item.User.IsActive,
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
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}
