//go:build integration

package repositories_test

import (
	"context"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestStagePlaceRequiresCountryWhenOffline(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	event := insertEvent(t, pool, start, start.Add(48*time.Hour))

	_, err := pool.Exec(ctx, `
		INSERT INTO stages (event_id, name, type, start_at, end_at, format)
		VALUES ($1, 'Final', 'DEMO', $2, $3, 'OFFLINE')`,
		event, start, start.Add(2*time.Hour))
	requireConstraint(t, err, "stages_place_required")

	if _, err := pool.Exec(ctx, `
		INSERT INTO stages (event_id, name, type, start_at, end_at, format, country_code, city)
		VALUES ($1, 'Final', 'DEMO', $2, $3, 'OFFLINE', 'RU', 'Kazan')`,
		event, start, start.Add(2*time.Hour)); err != nil {
		t.Fatalf("creating an offline stage with a country: %v", err)
	}
}

func TestStagePlaceAllowsNullFormatForInheritance(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	event := insertEvent(t, pool, start, start.Add(48*time.Hour))

	if _, err := pool.Exec(ctx, `
		INSERT INTO stages (event_id, name, type, start_at, end_at)
		VALUES ($1, 'Selection', 'SELECTION', $2, $3)`,
		event, start, start.Add(2*time.Hour)); err != nil {
		t.Fatalf("a stage without a format must inherit the event place: %v", err)
	}

	if _, err := pool.Exec(ctx, `
		INSERT INTO stages (event_id, name, type, start_at, end_at, format)
		VALUES ($1, 'Call', 'REGISTRATION', $2, $3, 'ONLINE')`,
		event, start, start.Add(2*time.Hour)); err != nil {
		t.Fatalf("an online stage needs no country: %v", err)
	}
}

func TestEventPrizeRequiresCurrency(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)

	_, err := pool.Exec(ctx, `
		INSERT INTO events (title, start_at, end_at, prize_pool)
		VALUES ('Prize without a currency', $1, $2, 500000)`, start, start.Add(48*time.Hour))
	requireConstraint(t, err, "events_prize_currency_paired")

	if _, err := pool.Exec(ctx, `
		INSERT INTO events (title, start_at, end_at, prize_pool, prize_currency)
		VALUES ('Prize with a currency', $1, $2, 500000, 'RUB')`,
		start, start.Add(48*time.Hour)); err != nil {
		t.Fatalf("a prize pool with a currency must be accepted: %v", err)
	}
}
