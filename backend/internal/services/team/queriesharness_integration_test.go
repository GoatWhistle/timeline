//go:build integration

package team_test

import (
	"context"
	"sync/atomic"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	auditrepo "github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	repoteam "github.com/GoatWhistle/timeline/internal/adapters/postgres/team"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	svcteam "github.com/GoatWhistle/timeline/internal/services/team"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type queryCounter struct{ n atomic.Int64 }

func (c *queryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn,
	_ pgx.TraceQueryStartData) context.Context {
	c.n.Add(1)
	return ctx
}

func (c *queryCounter) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}

type noopNotifier struct{}

func (noopNotifier) CancelForStatus(context.Context, uuid.UUID) error { return nil }

func countingPool(t *testing.T, counter *queryCounter) *pgxpool.Pool {
	t.Helper()
	dsn := testsupport.DSN(t)
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("parsing DSN: %v", err)
	}
	cfg.ConnConfig.Tracer = counter
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		t.Fatalf("connecting: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func newService(t *testing.T, db *postgres.DB) *svcteam.TeamService {
	t.Helper()
	return svcteam.NewTeamService(db,
		repoteam.NewTeams(db), repoteam.NewMembers(db), repoteam.NewEntries(db),
		repoteam.NewRosters(db), repoteam.NewJoinLinks(db),
		event.NewEvents(db), participation.NewParticipants(db),
		participation.NewRegistrations(db), participation.NewStatuses(db),
		identity.NewUsers(db), noopNotifier{}, audit.NewAuditService(auditrepo.NewAudit(db)),
		&config.Config{},
	)
}

const seededEvents = 6

func seedTeamWithEvents(t *testing.T, pool *pgxpool.Pool) (uuid.UUID, uuid.UUID) {
	t.Helper()
	ctx := context.Background()

	var lead uuid.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, first_name, last_name, nickname, locale)
		VALUES ('lead-perf@example.com', 'x', 'Lead', 'Perf', 'leadperf', 'en')
		RETURNING id`).Scan(&lead); err != nil {
		t.Fatalf("seeding the lead: %v", err)
	}

	var teamID uuid.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO teams (name, lead_user_id) VALUES ('Perf Team', $1) RETURNING id`,
		lead).Scan(&teamID); err != nil {
		t.Fatalf("seeding the team: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO team_members (team_id, user_id, state, joined_at)
		VALUES ($1, $2, 'ACTIVE', now())`, teamID, lead); err != nil {
		t.Fatalf("seeding the membership: %v", err)
	}

	for i := range seededEvents {
		addEntry(t, pool, teamID, i)
	}
	return teamID, lead
}

func addEntry(t *testing.T, pool *pgxpool.Pool, teamID uuid.UUID, index int) {
	t.Helper()
	ctx := context.Background()

	var eventID uuid.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO events (title, kind, format, origin, start_at, end_at, published_at,
			team_size_min, team_size_max)
		VALUES ('Perf Event ' || $1::int, 'HACKATHON', 'ONLINE', 'RU',
			now() + ($1::int || ' days')::interval,
			now() + (($1::int + 1) || ' days')::interval,
			now(), 2, 5)
		RETURNING id`, index+1).Scan(&eventID); err != nil {
		t.Fatalf("seeding an event: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO team_event_entries (team_id, event_id) VALUES ($1, $2)`,
		teamID, eventID); err != nil {
		t.Fatalf("seeding an entry: %v", err)
	}
}
