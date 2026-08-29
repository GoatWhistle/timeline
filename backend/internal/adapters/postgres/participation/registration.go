package participation

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Registrations struct{ db *postgres.DB }

func NewRegistrations(db *postgres.DB) *Registrations {
	return &Registrations{db: db}
}

const registrationColumns = `id, display_id, event_id, url, deadline_at, event_end_at, description,
	state, schedule_version, activation_version, notification_content_version, created_at, updated_at`

func scanRegistration(row pgx.Row) (*models.Registration, error) {
	var r models.Registration
	err := row.Scan(&r.ID, &r.DisplayID, &r.EventID, &r.URL, &r.DeadlineAt, &r.EventEndAt, &r.Description,
		&r.State, &r.ScheduleVersion, &r.ActivationVersion, &r.NotificationContentVersion,
		&r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &r, nil
}

func (r *Registrations) Create(ctx context.Context, eventID uuid.UUID, url string, deadline time.Time, description *string) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at, description)
		SELECT $1, $2, $3, h.end_at, $4 FROM events h WHERE h.id = $1
		RETURNING `+registrationColumns, eventID, url, deadline, description))
}

func (r *Registrations) GetByEvent(ctx context.Context, eventID uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+registrationColumns+` FROM registrations WHERE event_id = $1`, eventID))
}

func (r *Registrations) GetByEventForUpdate(ctx context.Context, eventID uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+registrationColumns+` FROM registrations WHERE event_id = $1 FOR UPDATE`, eventID))
}

func (r *Registrations) GetByID(ctx context.Context, id uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+registrationColumns+` FROM registrations WHERE id = $1`, id))
}

func (r *Registrations) Update(ctx context.Context, id uuid.UUID, url *string, deadline *time.Time,
	description *string, bumpSchedule, bumpContent bool) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registrations SET
			url = COALESCE($2, url),
			deadline_at = COALESCE($3, deadline_at),
			description = COALESCE($4, description),
			schedule_version = schedule_version + CASE WHEN $5 THEN 1 ELSE 0 END,
			notification_content_version = notification_content_version + CASE WHEN $6 THEN 1 ELSE 0 END
		WHERE id = $1
		RETURNING `+registrationColumns, id, url, deadline, description, bumpSchedule, bumpContent))
}

func (r *Registrations) BumpScheduleVersion(ctx context.Context, id uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registrations SET schedule_version = schedule_version + 1 WHERE id = $1
		RETURNING `+registrationColumns, id))
}

func (r *Registrations) Activate(ctx context.Context, id uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registrations SET
			state = 'ACTIVE',
			activation_version = activation_version + 1,
			schedule_version = schedule_version + 1
		WHERE id = $1 AND state = 'DISABLED'
		RETURNING `+registrationColumns, id))
}

func (r *Registrations) Disable(ctx context.Context, id uuid.UUID) (*models.Registration, error) {
	return scanRegistration(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE registrations SET state = 'DISABLED'
		WHERE id = $1 AND state = 'ACTIVE'
		RETURNING `+registrationColumns, id))
}
