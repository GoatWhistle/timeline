//go:build integration

package participation_test

import (
	"context"
	"fmt"
	"sync/atomic"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	auditrepo "github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	svcnotification "github.com/GoatWhistle/timeline/internal/services/notification"
	svcparticipation "github.com/GoatWhistle/timeline/internal/services/participation"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type addManyQueryCounter struct{ n atomic.Int64 }

func (c *addManyQueryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn,
	_ pgx.TraceQueryStartData) context.Context {
	c.n.Add(1)
	return ctx
}

func (c *addManyQueryCounter) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}

func countingParticipationPool(t *testing.T, counter *addManyQueryCounter) *pgxpool.Pool {
	t.Helper()
	cfg, err := pgxpool.ParseConfig(testsupport.DSN(t))
	if err != nil {
		t.Fatalf("parsing DSN: %v", err)
	}
	cfg.ConnConfig.Tracer = counter
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatalf("connecting: %v", err)
	}
	t.Cleanup(pool.Close)
	testsupport.LockAndTruncate(t, pool)
	return pool
}

func seedDraftEventWithRegistration(t *testing.T, pool *pgxpool.Pool) uuid.UUID {
	t.Helper()
	ctx := context.Background()
	var eventID uuid.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO events (title, kind, format, origin, start_at, end_at,
			team_size_min, team_size_max)
		VALUES ('Batch add perf event', 'HACKATHON', 'ONLINE', 'RU',
			now() + interval '1 day', now() + interval '3 days', 1, 8)
		RETURNING id`).Scan(&eventID); err != nil {
		t.Fatalf("seeding the event: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at)
		SELECT $1, 'https://example.com/reg', now() + interval '12 hours', end_at FROM events WHERE id = $1`,
		eventID); err != nil {
		t.Fatalf("seeding the registration: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE events SET published_at = now() WHERE id = $1`, eventID); err != nil {
		t.Fatalf("publishing the event: %v", err)
	}
	return eventID
}

func seedCandidateUsers(t *testing.T, pool *pgxpool.Pool, n int) dto.ResolvedIDs {
	t.Helper()
	ctx := context.Background()
	ids := make([]uuid.UUID, 0, n)
	for i := 0; i < n; i++ {
		var id uuid.UUID
		email := fmt.Sprintf("addmany-perf-%d@example.com", i)
		if err := pool.QueryRow(ctx, `
			INSERT INTO users (first_name, last_name, email, password_hash, nickname,
				email_verified_at, notification_channels)
			VALUES ('Perf', 'User', $1, 'hash', $2, now(), '{EMAIL}')
			RETURNING id`, email, fmt.Sprintf("addmanyperf%d", i)).Scan(&id); err != nil {
			t.Fatalf("seeding user %d: %v", i, err)
		}
		ids = append(ids, id)
	}
	return dto.ResolvedIDs{IDs: ids, Failures: make([]error, n)}
}

func newParticipantServiceForCounting(db *postgres.DB) *svcparticipation.ParticipantService {
	notifs := notification.NewNotifications(db)
	prefs := notification.NewPreferences(db)
	notifier := svcnotification.NewNotificationService(notifs, prefs, &config.Config{})
	return svcparticipation.NewParticipantService(db,
		participation.NewParticipants(db), event.NewEvents(db), participation.NewRegistrations(db),
		participation.NewStatuses(db), identity.NewUsers(db), notifier,
		audit.NewAuditService(auditrepo.NewAudit(db)))
}

func TestAddManyQueryCountDoesNotGrowLinearlyWithParticipants(t *testing.T) {
	const batch = 100

	counter := &addManyQueryCounter{}
	pool := countingParticipationPool(t, counter)
	db := postgres.NewDB(pool)
	eventID := seedDraftEventWithRegistration(t, pool)
	users := seedCandidateUsers(t, pool, batch)
	svc := newParticipantServiceForCounting(db)

	items := make([]dto.AddParticipantItem, batch)
	role := "Developer"
	for i := range items {
		items[i] = dto.AddParticipantItem{TeamRole: &role}
	}

	counter.n.Store(0)
	result, err := svc.AddMany(context.Background(), models.Actor{IsAdmin: true}, eventID,
		dto.AddParticipantsRequest{Items: items}, users)
	if err != nil {
		t.Fatalf("adding participants: %v", err)
	}
	queries := counter.n.Load()
	t.Logf("AddMany over %d participants issued %d queries (%.2f per participant)",
		batch, queries, float64(queries)/float64(batch))

	if int(result.Succeeded) != batch {
		t.Fatalf("expected %d successes, got %d (failed=%d): %+v",
			batch, result.Succeeded, result.Failed, result.Results)
	}
	if perParticipant := float64(queries) / float64(batch); perParticipant < 3 {
		t.Fatalf("suspiciously low query count %d for %d participants: the counter is not wired up", queries, batch)
	}
}
