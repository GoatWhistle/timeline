package testsupport

import (
	"context"
	"errors"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/migrations"
)

var once sync.Once

var tables = []string{
	"participant_links",
	"resource_links",
	"system_event_reads",
	"system_events",
	"observed_states",
	"event_bookmarks",
	"participant_retrospectives",
	"participant_outcomes",
	"participant_artifacts",
	"participant_notes",
	"participant_tasks",
	"audit_log",
	"notifications",
	"notification_rules",
	"registration_statuses",
	"registrations",
	"event_participants",
	"stages",
	"events",
	"invites",
	"one_time_tokens",
	"sessions",
	"users",
}

func DSN(t *testing.T) string {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		t.Skip("integration test skipped: TEST_DATABASE_URL is not set")
	}
	once.Do(func() {
		applyMigrations(t, dsn)
	})
	return dsn
}

func applyMigrations(t *testing.T, dsn string) {
	t.Helper()
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		t.Fatalf("migration source: %v", err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", source, pgxURL(dsn))
	if err != nil {
		t.Fatalf("initialising migrations: %v", err)
	}
	defer m.Close()
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		t.Fatalf("applying migrations: %v", err)
	}
}

func pgxURL(dsn string) string {
	switch {
	case len(dsn) > 13 && dsn[:13] == "postgresql://":
		return "pgx5://" + dsn[13:]
	case len(dsn) > 11 && dsn[:11] == "postgres://":
		return "pgx5://" + dsn[11:]
	default:
		return dsn
	}
}

func Pool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := DSN(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("connecting to the database: %v", err)
	}
	t.Cleanup(pool.Close)

	lock(t, dsn)
	Truncate(t, pool)
	return pool
}

const exclusiveLockID = 8721340951

func lock(t *testing.T, dsn string) {
	t.Helper()
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("opening a lock connection: %v", err)
	}
	if _, err := conn.Exec(ctx, `SELECT pg_advisory_lock($1)`, int64(exclusiveLockID)); err != nil {
		t.Fatalf("acquiring the exclusive test lock: %v", err)
	}
	t.Cleanup(func() {
		if _, err := conn.Exec(ctx, `SELECT pg_advisory_unlock($1)`, int64(exclusiveLockID)); err != nil {
			t.Logf("releasing the exclusive test lock: %v", err)
		}
		if err := conn.Close(ctx); err != nil {
			t.Logf("closing the lock connection: %v", err)
		}
	})
}

func DB(t *testing.T) *postgres.DB {
	t.Helper()
	return postgres.NewDB(Pool(t))
}

func Truncate(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	stmt := "TRUNCATE TABLE " + join(tables) + " RESTART IDENTITY CASCADE"
	if _, err := pool.Exec(ctx, stmt); err != nil {
		t.Fatalf("truncating tables: %v", err)
	}
}

func join(items []string) string {
	out := ""
	for i, item := range items {
		if i > 0 {
			out += ", "
		}
		out += item
	}
	return out
}
