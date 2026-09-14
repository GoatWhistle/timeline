package identity

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type ReminderSchedules struct{ db *postgres.DB }

func NewReminderSchedules(db *postgres.DB) *ReminderSchedules {
	return &ReminderSchedules{db: db}
}

func (r *ReminderSchedules) Get(ctx context.Context, userID uuid.UUID) (*models.ReminderSchedule, error) {
	schedule := models.NewReminderSchedule()

	row := r.db.Q(ctx).QueryRow(ctx, `
		SELECT reminder_overdue_enabled, reminder_schedule_version FROM users WHERE id = $1`, userID)
	if err := row.Scan(&schedule.OverdueEnabled, &schedule.Version); err != nil {
		return nil, mapError(err)
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT occasion, days_before FROM user_reminder_schedule
		WHERE user_id = $1
		ORDER BY occasion, days_before`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			occasion string
			days     int
		)
		if err := rows.Scan(&occasion, &days); err != nil {
			return nil, mapError(err)
		}
		key := models.NotificationOccasion(occasion)
		schedule.Days[key] = append(schedule.Days[key], days)
	}
	return schedule, mapError(rows.Err())
}

func (r *ReminderSchedules) Replace(ctx context.Context, userID uuid.UUID,
	schedule *models.ReminderSchedule) (int, error) {
	if _, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM user_reminder_schedule WHERE user_id = $1`, userID); err != nil {
		return 0, mapError(err)
	}

	for _, occasion := range models.ReminderOccasions {
		for _, days := range models.NormalizeReminderDays(schedule.Days[occasion]) {
			if _, err := r.db.Q(ctx).Exec(ctx, `
				INSERT INTO user_reminder_schedule (user_id, occasion, days_before)
				VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
				userID, string(occasion), days); err != nil {
				return 0, mapError(err)
			}
		}
	}

	var version int
	err := r.db.Q(ctx).QueryRow(ctx, `
		UPDATE users SET reminder_overdue_enabled = $2,
			reminder_schedule_version = reminder_schedule_version + 1
		WHERE id = $1
		RETURNING reminder_schedule_version`, userID, schedule.OverdueEnabled).Scan(&version)
	if err != nil {
		return 0, mapError(err)
	}
	return version, nil
}
