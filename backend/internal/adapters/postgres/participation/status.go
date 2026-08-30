package participation

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

type Statuses struct{ db *postgres.DB }

func NewStatuses(db *postgres.DB) *Statuses { return &Statuses{db: db} }

const statusColumns = `id, display_id, event_id, registration_id, participant_id, status, todo_cycle,
	registered_at, last_change_source, last_changed_by_user_id, note, created_at, updated_at`

func scanStatus(row pgx.Row) (*models.RegistrationStatus, error) {
	var s models.RegistrationStatus
	err := row.Scan(&s.ID, &s.DisplayID, &s.EventID, &s.RegistrationID, &s.ParticipantID, &s.Status, &s.TodoCycle,
		&s.RegisteredAt, &s.LastChangeSource, &s.LastChangedByUserID, &s.Note, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &s, nil
}

func (r *Statuses) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM registration_statuses WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("registration status not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Statuses) EnsureForParticipant(ctx context.Context, eventID, registrationID, participantID uuid.UUID) (*models.RegistrationStatus, bool, error) {
	row := r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO registration_statuses (event_id, registration_id, participant_id, status, last_change_source)
		VALUES ($1, $2, $3, 'TODO', 'SYSTEM')
		ON CONFLICT (registration_id, participant_id) DO NOTHING
		RETURNING `+statusColumns, eventID, registrationID, participantID)

	status, err := scanStatus(row)
	if err == nil {
		return status, true, nil
	}
	if !errors.Is(err, models.ErrNotFound) {
		return nil, false, err
	}
	existing, err := r.GetByParticipant(ctx, registrationID, participantID)
	if err != nil {
		return nil, false, err
	}
	return existing, false, nil
}

func (r *Statuses) GetByID(ctx context.Context, id uuid.UUID) (*models.RegistrationStatus, error) {
	return scanStatus(r.db.Q(ctx).QueryRow(ctx, `SELECT `+statusColumns+` FROM registration_statuses WHERE id = $1`, id))
}

func (r *Statuses) GetByIDForUpdate(ctx context.Context, id uuid.UUID) (*models.RegistrationStatus, error) {
	return scanStatus(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+statusColumns+` FROM registration_statuses WHERE id = $1 FOR UPDATE`, id))
}

func (r *Statuses) GetByParticipant(ctx context.Context, registrationID, participantID uuid.UUID) (*models.RegistrationStatus, error) {
	return scanStatus(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+statusColumns+` FROM registration_statuses
		 WHERE registration_id = $1 AND participant_id = $2`, registrationID, participantID))
}

func (r *Statuses) SetStatus(ctx context.Context, id uuid.UUID, value models.RegistrationStatusValue,
	source models.ChangeSource, actor *uuid.UUID, note *string) (*models.RegistrationStatus, error) {
	return scanStatus(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registration_statuses SET
			status = $2,
			todo_cycle = todo_cycle + CASE WHEN $2 = 'TODO' AND status <> 'TODO' THEN 1 ELSE 0 END,
			registered_at = CASE WHEN $2 = 'DONE' THEN now() ELSE NULL END,
			last_change_source = $3,
			last_changed_by_user_id = $4,
			note = COALESCE($5, note)
		WHERE id = $1
		RETURNING `+statusColumns, id, value, source, actor, note))
}

func (r *Statuses) List(ctx context.Context, eventID uuid.UUID, page models.Page) ([]dto.RegistrationStatusResponse, int64, error) {
	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM registration_statuses WHERE event_id = $1`, eventID).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT s.id, s.display_id, e.display_id, rg.display_id, p.display_id, s.status, s.todo_cycle,
		       s.registered_at, s.last_change_source,
		       (SELECT cu.display_id FROM users cu WHERE cu.id = s.last_changed_by_user_id),
		       s.note, s.updated_at,
		       u.display_id, u.first_name, u.middle_name, u.last_name, u.nickname, u.email, u.is_active
		FROM registration_statuses s
		JOIN events e ON e.id = s.event_id
		JOIN registrations rg ON rg.id = s.registration_id
		JOIN event_participants p ON p.id = s.participant_id
		JOIN users u ON u.id = p.user_id
		WHERE s.event_id = $1
		ORDER BY lower(u.last_name), lower(u.first_name)
		LIMIT $2 OFFSET $3`, eventID, page.Limit(), page.Offset())
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.RegistrationStatusResponse, 0, page.Limit())
	for rows.Next() {
		var (
			item        dto.RegistrationStatusResponse
			user        dto.UserSummary
			rawStatusID uuid.UUID
		)
		if err := rows.Scan(&rawStatusID, &item.ID, &item.EventID, &item.RegistrationID, &item.ParticipantID,
			&item.Status, &item.TodoCycle, &item.RegisteredAt, &item.LastChangeSource,
			&item.LastChangedByUserID, &item.Note, &item.UpdatedAt,
			&user.ID, &user.FirstName, &user.MiddleName, &user.LastName,
			&user.Nickname, &user.Email, &user.IsActive); err != nil {
			return nil, 0, mapError(err)
		}
		user.Fill(locale.Default)
		item.User = &user
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}
