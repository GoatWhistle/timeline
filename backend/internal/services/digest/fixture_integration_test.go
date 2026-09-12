//go:build integration

package digest_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	pginbox "github.com/GoatWhistle/timeline/internal/adapters/postgres/inbox"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/query"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	svcdigest "github.com/GoatWhistle/timeline/internal/services/digest"
	svcinbox "github.com/GoatWhistle/timeline/internal/services/inbox"
	svcnotification "github.com/GoatWhistle/timeline/internal/services/notification"
	svcrealtime "github.com/GoatWhistle/timeline/internal/services/realtime"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type digestStack struct {
	db       *postgres.DB
	svc      *svcdigest.DigestService
	notifs   *notification.Notifications
	notifier *svcnotification.NotificationService
}

func newDigestStack(t *testing.T) *digestStack {
	t.Helper()
	db := testsupport.DB(t)
	feed := svcrealtime.NewSystemEventService(db, systemevent.NewEvents(db))
	moscow, err := time.LoadLocation("Europe/Moscow")
	if err != nil {
		t.Fatalf("loading the fallback zone: %v", err)
	}
	app := config.App{SystemTZ: moscow, SystemTZID: "Europe/Moscow", PublicURL: "http://localhost:5173"}
	limits := config.Digest{Interval: time.Hour, Batch: 200, MaxItems: 50}
	cfg := &config.Config{App: app}
	notifs := notification.NewNotifications(db)
	notifier := svcnotification.NewNotificationService(notifs, notification.NewPreferences(db), cfg)
	notifier.WithInbox(svcinbox.NewService(pginbox.NewItems(db), nil))
	return &digestStack{db: db, notifs: notifs, notifier: notifier,
		svc: svcdigest.NewDigestService(query.NewDigests(db), feed, notifier, limits, app)}
}

func (d *digestStack) user(t *testing.T, timezone string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := d.db.Pool().QueryRow(context.Background(), `
		INSERT INTO users (first_name, last_name, email, password_hash, email_verified_at, timezone)
		VALUES ('Test', 'Owner', $1, 'hash', now(), $2) RETURNING id`,
		"owner-"+uuid.NewString()+"@example.com", timezone).Scan(&id)
	if err != nil {
		t.Fatalf("creating a user: %v", err)
	}
	return id
}

func (d *digestStack) event(t *testing.T, start, end time.Time) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := d.db.Pool().QueryRow(context.Background(), `
		INSERT INTO events (title, start_at, end_at, published_at, format, origin, kind)
		VALUES ('Demo Day', $1, $2, now(), 'ONLINE', 'RU', 'HACKATHON') RETURNING id`,
		start, end).Scan(&id)
	if err != nil {
		t.Fatalf("creating an event: %v", err)
	}
	return id
}

func (d *digestStack) task(t *testing.T, userID, eventID uuid.UUID, dueAt time.Time) {
	t.Helper()
	_, err := d.db.Pool().Exec(context.Background(), `
		INSERT INTO participant_tasks (user_id, event_id, title, due_at)
		VALUES ($1, $2, 'Record the demo', $3)`, userID, eventID, dueAt)
	if err != nil {
		t.Fatalf("creating a task: %v", err)
	}
}

func (d *digestStack) digests(t *testing.T, owner uuid.UUID) []map[string]any {
	t.Helper()
	rows, err := d.db.Pool().Query(context.Background(), `
		SELECT payload_json FROM system_events
		WHERE event_type = $1 AND audience_kind = 'USER' AND audience_user_id = $2`,
		string(models.EventWeeklyDigest), owner)
	if err != nil {
		t.Fatalf("reading digests: %v", err)
	}
	defer rows.Close()

	var out []map[string]any
	for rows.Next() {
		payload := map[string]any{}
		if err := rows.Scan(&payload); err != nil {
			t.Fatalf("scanning a digest payload: %v", err)
		}
		out = append(out, payload)
	}
	return out
}

func (d *digestStack) count(t *testing.T, table string) int64 {
	t.Helper()
	var total int64
	if err := d.db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM `+table).Scan(&total); err != nil {
		t.Fatalf("counting %s: %v", table, err)
	}
	return total
}

func thisWeek(t *testing.T, timezone string) time.Time {
	t.Helper()
	zone, err := time.LoadLocation(timezone)
	if err != nil {
		t.Fatalf("loading %s: %v", timezone, err)
	}
	start, end := svcdigest.WeekBounds(time.Now().UTC(), zone)
	middle := start.Add(end.Sub(start) / 2)
	if middle.Before(time.Now().UTC()) {
		return time.Now().UTC().Add(time.Minute)
	}
	return middle
}
