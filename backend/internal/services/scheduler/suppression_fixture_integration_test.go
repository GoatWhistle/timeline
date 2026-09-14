//go:build integration

package scheduler_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	svcnotification "github.com/GoatWhistle/timeline/internal/services/notification"
	svcscheduler "github.com/GoatWhistle/timeline/internal/services/scheduler"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type stand struct {
	t              *testing.T
	ctx            context.Context
	pool           *pgxpool.Pool
	planner        *svcscheduler.SchedulerService
	clock          *standClock
	EventID        uuid.UUID
	UserID         uuid.UUID
	ParticipantID  uuid.UUID
	RegistrationID uuid.UUID
	StatusID       uuid.UUID
	StageID        uuid.UUID
	DeadlineAt     time.Time
	EventStartAt   time.Time
	EventEndAt     time.Time
	StageStartAt   time.Time
}

type standClock struct{ at time.Time }

func (c *standClock) Now() time.Time { return c.at }

func standConfig(t *testing.T) *config.Config {
	t.Helper()
	loc, err := time.LoadLocation("UTC")
	if err != nil {
		t.Fatalf("loading timezone: %v", err)
	}
	cfg := &config.Config{}
	cfg.App.SystemTZ = loc
	cfg.App.SystemTZID = "UTC"
	cfg.Notify.SchedulerBatch = 100
	cfg.Notify.OverdueLead = 24 * time.Hour
	return cfg
}

func newStand(t *testing.T) *stand {
	t.Helper()
	pool := testsupport.Pool(t)
	db := postgres.NewDB(pool)
	cfg := standConfig(t)

	s := &stand{t: t, ctx: context.Background(), pool: pool}
	now := time.Now().UTC().Truncate(time.Second)
	s.EventStartAt = now.Add(72 * time.Hour)
	s.EventEndAt = now.Add(120 * time.Hour)
	s.DeadlineAt = now.Add(24 * time.Hour)
	s.StageStartAt = now.Add(96 * time.Hour)

	s.EventID = s.scanUUID(`
		INSERT INTO events (title, start_at, end_at, published_at)
		VALUES ('Suppression event', $1, $2, now()) RETURNING id`, s.EventStartAt, s.EventEndAt)
	s.StageID = s.scanUUID(`
		INSERT INTO stages (event_id, name, type, start_at, end_at)
		VALUES ($1, 'Demo', 'DEMO', $2, $3) RETURNING id`,
		s.EventID, s.StageStartAt, s.StageStartAt.Add(2*time.Hour))
	chatID := "chat-suppression"
	s.UserID = s.scanUUID(`
		INSERT INTO users (first_name, last_name, email, password_hash, telegram_chat_id,
			email_verified_at, notification_channels)
		VALUES ('Test', 'User', 'suppression@example.com', 'hash', $1, now(), '{TELEGRAM,EMAIL}')
		RETURNING id`, chatID)
	s.ParticipantID = s.scanUUID(`
		INSERT INTO event_participants (event_id, user_id, team_role)
		VALUES ($1, $2, 'Developer') RETURNING id`, s.EventID, s.UserID)
	s.RegistrationID = s.scanUUID(`
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at)
		VALUES ($1, 'https://example.com/reg', $2, $3) RETURNING id`,
		s.EventID, s.DeadlineAt, s.EventEndAt)
	s.StatusID = s.scanUUID(`
		INSERT INTO registration_statuses (event_id, registration_id, participant_id)
		VALUES ($1, $2, $3) RETURNING id`, s.EventID, s.RegistrationID, s.ParticipantID)

	s.clearSchedule()

	notifier := svcnotification.NewNotificationService(
		notification.NewNotifications(db), notification.NewPreferences(db), cfg)
	s.planner = svcscheduler.NewSchedulerService(db, notification.NewScheduler(db),
		participation.NewStatuses(db), notifier, cfg)

	s.clock = &standClock{at: s.DeadlineAt.Add(-30 * time.Minute)}
	svcnotification.SetNotificationClock(notifier, s.clock.Now)
	svcscheduler.SetSchedulerClock(s.planner, s.clock.Now)
	return s
}

func (s *stand) scanUUID(query string, args ...any) uuid.UUID {
	s.t.Helper()
	var id uuid.UUID
	if err := s.pool.QueryRow(s.ctx, query, args...).Scan(&id); err != nil {
		s.t.Fatalf("seeding fixture: %v", err)
	}
	return id
}

func (s *stand) exec(query string, args ...any) {
	s.t.Helper()
	if _, err := s.pool.Exec(s.ctx, query, args...); err != nil {
		s.t.Fatalf("executing fixture statement: %v", err)
	}
}

func (s *stand) clearSchedule() {
	s.t.Helper()
	s.exec(`DELETE FROM user_reminder_schedule WHERE user_id = $1`, s.UserID)
	s.exec(`UPDATE users SET reminder_overdue_enabled = false WHERE id = $1`, s.UserID)
}

func (s *stand) want(occasion models.NotificationOccasion, days int) {
	s.t.Helper()
	s.exec(`INSERT INTO user_reminder_schedule (user_id, occasion, days_before)
		VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, s.UserID, string(occasion), days)
}

func (s *stand) wantOverdue() {
	s.t.Helper()
	s.exec(`UPDATE users SET reminder_overdue_enabled = true WHERE id = $1`, s.UserID)
}

func (s *stand) mute(occasion models.NotificationOccasion, channel models.Channel) {
	s.t.Helper()
	s.exec(`INSERT INTO notification_preferences (user_id, occasion, channel, enabled)
		VALUES ($1, $2, $3, false)`, s.UserID, string(occasion), string(channel))
}

func (s *stand) reconcile() *svcscheduler.ReconcileResult {
	s.t.Helper()
	result, err := s.planner.Run(s.ctx)
	if err != nil {
		s.t.Fatalf("reconciliation failed: %v", err)
	}
	return result
}

func (s *stand) channels() []models.Channel {
	s.t.Helper()
	rows, err := s.pool.Query(s.ctx,
		`SELECT requested_channel FROM notifications ORDER BY requested_channel`)
	if err != nil {
		s.t.Fatalf("listing requested channels: %v", err)
	}
	defer rows.Close()
	out := make([]models.Channel, 0, 4)
	for rows.Next() {
		var ch models.Channel
		if err := rows.Scan(&ch); err != nil {
			s.t.Fatalf("scanning requested channel: %v", err)
		}
		out = append(out, ch)
	}
	return out
}

func (s *stand) countAll() int {
	s.t.Helper()
	var count int
	if err := s.pool.QueryRow(s.ctx, `SELECT count(*) FROM notifications`).Scan(&count); err != nil {
		s.t.Fatalf("counting notifications: %v", err)
	}
	return count
}

func (s *stand) countByType(kind models.NotificationType) int {
	s.t.Helper()
	var count int
	if err := s.pool.QueryRow(s.ctx,
		`SELECT count(*) FROM notifications WHERE notification_type = $1`, string(kind)).
		Scan(&count); err != nil {
		s.t.Fatalf("counting notifications by type: %v", err)
	}
	return count
}

func (s *stand) at(moment time.Time) {
	s.t.Helper()
	s.clock.at = moment
}

func (s *stand) atOverdue() {
	s.t.Helper()
	s.at(s.DeadlineAt.Add(25 * time.Hour))
}

func (s *stand) atEventStartReminder() {
	s.t.Helper()
	s.at(s.EventStartAt.Add(-23 * time.Hour))
}

func (s *stand) atStageStartReminder() {
	s.t.Helper()
	s.at(s.StageStartAt.Add(-23 * time.Hour))
}

func (s *stand) dropRegistration() {
	s.t.Helper()
	s.exec(`DELETE FROM registration_statuses WHERE registration_id = $1`, s.RegistrationID)
	s.exec(`DELETE FROM registrations WHERE id = $1`, s.RegistrationID)
}

func (s *stand) countReminderDays(kind models.NotificationType) []int {
	s.t.Helper()
	rows, err := s.pool.Query(s.ctx, `
		SELECT DISTINCT reminder_days_before FROM notifications
		WHERE notification_type = $1 ORDER BY reminder_days_before`, string(kind))
	if err != nil {
		s.t.Fatalf("listing reminder days: %v", err)
	}
	defer rows.Close()
	out := make([]int, 0, 4)
	for rows.Next() {
		var days int
		if err := rows.Scan(&days); err != nil {
			s.t.Fatalf("scanning reminder days: %v", err)
		}
		out = append(out, days)
	}
	return out
}

func (s *stand) bumpScheduleVersion() {
	s.t.Helper()
	s.exec(`UPDATE users SET reminder_schedule_version = reminder_schedule_version + 1
		WHERE id = $1`, s.UserID)
}
