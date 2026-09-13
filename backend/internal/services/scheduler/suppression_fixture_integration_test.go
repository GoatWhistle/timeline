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
	DeadlineAt     time.Time
	EventEndAt     time.Time
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
	return cfg
}

func newStand(t *testing.T) *stand {
	t.Helper()
	pool := testsupport.Pool(t)
	db := postgres.NewDB(pool)
	cfg := standConfig(t)

	s := &stand{t: t, ctx: context.Background(), pool: pool}
	now := time.Now().UTC().Truncate(time.Second)
	s.EventEndAt = now.Add(48 * time.Hour)
	s.DeadlineAt = now.Add(24 * time.Hour)

	s.EventID = s.scanUUID(`
		INSERT INTO events (title, start_at, end_at, published_at)
		VALUES ('Suppression event', $1, $2, now()) RETURNING id`, now, s.EventEndAt)
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

	notifier := svcnotification.NewNotificationService(
		notification.NewNotifications(db), notification.NewPreferences(db), cfg)
	s.planner = svcscheduler.NewSchedulerService(db, notification.NewScheduler(db),
		participation.NewRules(db), participation.NewStatuses(db), notifier, cfg)

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

func (s *stand) addRule(offsetMinutes, slot int) uuid.UUID {
	s.t.Helper()
	return s.scanUUID(`
		INSERT INTO notification_rules (registration_id, offset_minutes, slot_no)
		VALUES ($1, $2, $3) RETURNING id`, s.RegistrationID, offsetMinutes, slot)
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
