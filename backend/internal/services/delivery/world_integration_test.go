//go:build integration

package delivery_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type world struct {
	t              *testing.T
	ctx            context.Context
	pool           *pgxpool.Pool
	db             *postgres.DB
	cfg            *config.Config
	EventID        uuid.UUID
	UserID         uuid.UUID
	ParticipantID  uuid.UUID
	RegistrationID uuid.UUID
	StatusID       uuid.UUID
	DeadlineAt     time.Time
	EventEndAt     time.Time
}

func testConfig(t *testing.T) *config.Config {
	t.Helper()
	loc, err := time.LoadLocation("UTC")
	if err != nil {
		t.Fatalf("loading timezone: %v", err)
	}
	cfg := &config.Config{}
	cfg.App.SystemTZ = loc
	cfg.App.SystemTZID = "UTC"
	cfg.Notify.SchedulerBatch = 100
	cfg.Notify.WorkerBatch = 20
	cfg.Notify.LeaseTTL = 2 * time.Minute
	cfg.Notify.MaxProviderCalls = 4
	cfg.Notify.Backoff = []time.Duration{time.Minute, 5 * time.Minute, 30 * time.Minute}
	cfg.Retent.AuditLog = 365 * 24 * time.Hour
	cfg.Retent.NotificationPayload = 90 * 24 * time.Hour
	return cfg
}

func newWorld(t *testing.T) *world {
	t.Helper()
	pool := testsupport.Pool(t)
	w := &world{
		t:    t,
		ctx:  context.Background(),
		pool: pool,
		db:   postgres.NewDB(pool),
		cfg:  testConfig(t),
	}
	now := time.Now().UTC().Truncate(time.Second)
	w.EventEndAt = now.Add(48 * time.Hour)
	w.DeadlineAt = now.Add(24 * time.Hour)

	w.EventID = w.scanUUID(`
		INSERT INTO events (title, start_at, end_at, published_at)
		VALUES ('Test event', $1, $2, now()) RETURNING id`, now, w.EventEndAt)
	w.UserID = w.newUser("member@example.com", true, true)
	w.ParticipantID = w.scanUUID(`
		INSERT INTO event_participants (event_id, user_id, team_role)
		VALUES ($1, $2, 'Developer') RETURNING id`, w.EventID, w.UserID)
	w.RegistrationID = w.scanUUID(`
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at)
		VALUES ($1, 'https://example.com/reg', $2, $3) RETURNING id`,
		w.EventID, w.DeadlineAt, w.EventEndAt)
	w.StatusID = w.scanUUID(`
		INSERT INTO registration_statuses (event_id, registration_id, participant_id)
		VALUES ($1, $2, $3) RETURNING id`, w.EventID, w.RegistrationID, w.ParticipantID)
	return w
}

func (w *world) newUser(email string, telegram, verified bool) uuid.UUID {
	w.t.Helper()
	var chatID *string
	if telegram {
		value := "chat-" + email
		chatID = &value
	}
	verifiedAt := "NULL"
	if verified {
		verifiedAt = "now()"
	}
	return w.scanUUID(`
		INSERT INTO users (first_name, last_name, email, password_hash, telegram_chat_id, email_verified_at)
		VALUES ('Test', 'User', $1, 'hash', $2, `+verifiedAt+`) RETURNING id`, email, chatID)
}

func (w *world) scanUUID(query string, args ...any) uuid.UUID {
	w.t.Helper()
	var id uuid.UUID
	if err := w.pool.QueryRow(w.ctx, query, args...).Scan(&id); err != nil {
		w.t.Fatalf("seeding fixture: %v", err)
	}
	return id
}

func (w *world) exec(query string, args ...any) {
	w.t.Helper()
	if _, err := w.pool.Exec(w.ctx, query, args...); err != nil {
		w.t.Fatalf("executing fixture statement: %v", err)
	}
}

func (w *world) addRule(offsetMinutes, slot int, override *models.Channel) uuid.UUID {
	w.t.Helper()
	return w.scanUUID(`
		INSERT INTO notification_rules (registration_id, offset_minutes, slot_no, channel_override)
		VALUES ($1, $2, $3, $4) RETURNING id`, w.RegistrationID, offsetMinutes, slot, override)
}

func (w *world) setPreferredChannel(ch models.Channel) {
	w.t.Helper()
	w.exec(`UPDATE users SET preferred_channel = $2 WHERE id = $1`, w.UserID, string(ch))
}

func (w *world) setChannels(telegram, verified bool) {
	w.t.Helper()
	var chatID *string
	if telegram {
		value := "chat-primary"
		chatID = &value
	}
	if verified {
		w.exec(`UPDATE users SET telegram_chat_id = $2, email_verified_at = now() WHERE id = $1`, w.UserID, chatID)
		return
	}
	w.exec(`UPDATE users SET telegram_chat_id = $2, email_verified_at = NULL WHERE id = $1`, w.UserID, chatID)
}

func (w *world) setStatus(value models.RegistrationStatusValue) {
	w.t.Helper()
	w.exec(`
		UPDATE registration_statuses SET
			status = $2,
			todo_cycle = todo_cycle + CASE WHEN $2 = 'TODO' AND status <> 'TODO' THEN 1 ELSE 0 END
		WHERE id = $1`, w.StatusID, string(value))
}

func (w *world) countByKey(key string) int {
	w.t.Helper()
	var count int
	if err := w.pool.QueryRow(w.ctx,
		`SELECT count(*) FROM notifications WHERE logical_key = $1`, key).Scan(&count); err != nil {
		w.t.Fatalf("counting notifications: %v", err)
	}
	return count
}

func (w *world) countAll() int {
	w.t.Helper()
	var count int
	if err := w.pool.QueryRow(w.ctx, `SELECT count(*) FROM notifications`).Scan(&count); err != nil {
		w.t.Fatalf("counting notifications: %v", err)
	}
	return count
}

func (w *world) keys() []string {
	w.t.Helper()
	rows, err := w.pool.Query(w.ctx, `SELECT logical_key FROM notifications ORDER BY created_at, logical_key`)
	if err != nil {
		w.t.Fatalf("listing keys: %v", err)
	}
	defer rows.Close()
	out := make([]string, 0, 4)
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			w.t.Fatalf("scanning key: %v", err)
		}
		out = append(out, key)
	}
	return out
}

type recordingSender struct {
	mu      sync.Mutex
	results []error
	calls   []models.OutboundMessage
	link    string
}

func newSender(results ...error) *recordingSender {
	return &recordingSender{results: results}
}

func (s *recordingSender) Send(_ context.Context, msg models.OutboundMessage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.calls = append(s.calls, msg)
	if len(s.results) == 0 {
		return nil
	}
	err := s.results[0]
	if len(s.results) > 1 {
		s.results = s.results[1:]
	}
	return err
}

func (s *recordingSender) DeepLink(token string) string { return s.link + token }

func (s *recordingSender) count() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.calls)
}
