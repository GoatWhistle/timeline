// Package testsupport готовит окружение интеграционных тестов: подключение к
// PostgreSQL, применение миграций и очистку данных между тестами.
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
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/migrations"
)

var (
	once      sync.Once
	sharedDSN string
)

// Таблицы очищаются в порядке, безопасном для внешних ключей.
var tables = []string{
	"audit_log",
	"notifications",
	"notification_rules",
	"registration_statuses",
	"registrations",
	"hackathon_participants",
	"stages",
	"hackathons",
	"invites",
	"one_time_tokens",
	"sessions",
	"users",
}

// DSN возвращает строку подключения тестовой базы либо пропускает тест.
func DSN(t *testing.T) string {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		t.Skip("интеграционный тест пропущен: не задан TEST_DATABASE_URL")
	}
	once.Do(func() {
		sharedDSN = dsn
		applyMigrations(t, dsn)
	})
	return dsn
}

func applyMigrations(t *testing.T, dsn string) {
	t.Helper()
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		t.Fatalf("источник миграций: %v", err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", source, pgxURL(dsn))
	if err != nil {
		t.Fatalf("инициализация миграций: %v", err)
	}
	defer m.Close()
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		t.Fatalf("применение миграций: %v", err)
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

// Pool открывает пул к тестовой базе, применяет миграции и очищает данные.
func Pool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := DSN(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("подключение к базе: %v", err)
	}
	t.Cleanup(pool.Close)

	Truncate(t, pool)
	return pool
}

// DB открывает подготовленное подключение слоя репозиториев.
func DB(t *testing.T) *repositories.DB {
	t.Helper()
	return repositories.NewDB(Pool(t))
}

// Truncate очищает все таблицы схемы. TRUNCATE не вызывает построчные триггеры,
// поэтому запреты на удаление уведомлений и записей аудита ему не мешают.
func Truncate(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	stmt := "TRUNCATE TABLE " + join(tables) + " RESTART IDENTITY CASCADE"
	if _, err := pool.Exec(ctx, stmt); err != nil {
		t.Fatalf("очистка таблиц: %v", err)
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
