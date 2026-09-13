//go:build integration

package delivery_test

import (
	"context"
	"fmt"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/config"
	svcdelivery "github.com/GoatWhistle/timeline/internal/services/delivery"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type queryCounter struct{ n atomic.Int64 }

func (c *queryCounter) TraceQueryStart(ctx context.Context, _ *pgx.Conn,
	_ pgx.TraceQueryStartData) context.Context {
	c.n.Add(1)
	return ctx
}

func (c *queryCounter) TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData) {}

func countingPool(t *testing.T, counter *queryCounter) *pgxpool.Pool {
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

type drainRig struct {
	ctx      context.Context
	pool     *pgxpool.Pool
	notifs   *notification.Notifications
	delivery *svcdelivery.DeliveryService
	email    *recordingSender
	clock    *testClock
	batch    int
}

func newDrainRig(t *testing.T, pool *pgxpool.Pool, batch int) *drainRig {
	t.Helper()
	db := postgres.NewDB(pool)
	cfg := &config.Config{}
	loc, err := time.LoadLocation("UTC")
	if err != nil {
		t.Fatalf("loading timezone: %v", err)
	}
	cfg.App.SystemTZ = loc
	cfg.App.SystemTZID = "UTC"
	cfg.Notify.WorkerBatch = batch
	cfg.Notify.LeaseTTL = 2 * time.Minute
	cfg.Notify.MaxProviderCalls = 4
	cfg.Notify.Backoff = []time.Duration{time.Minute}

	notifs := notification.NewNotifications(db)
	email := newSender()
	svc := svcdelivery.NewDeliveryService(db, notifs, notification.NewScheduler(db),
		identity.NewUsers(db), event.NewEvents(db), audit.NewAudit(db),
		newSender(), email, cfg)
	clock := &testClock{at: time.Now().UTC().Truncate(time.Second)}
	svcdelivery.SetDeliveryClock(svc, clock.Now)

	return &drainRig{ctx: context.Background(), pool: pool, notifs: notifs,
		delivery: svc, email: email, clock: clock, batch: batch}
}

func (d *drainRig) seedPersonalQueue(t *testing.T, n int) uuid.UUID {
	t.Helper()
	var userID uuid.UUID
	if err := d.pool.QueryRow(d.ctx, `
		INSERT INTO users (first_name, last_name, email, password_hash, nickname,
			email_verified_at, notification_channels)
		VALUES ('Drain', 'Target', 'drain-target@example.com', 'hash', 'draintarget',
			now(), '{EMAIL}')
		RETURNING id`).Scan(&userID); err != nil {
		t.Fatalf("seeding the recipient: %v", err)
	}
	rows := make([][]any, 0, n)
	scheduled := d.clock.at.Add(-time.Hour)
	for i := 0; i < n; i++ {
		rows = append(rows, []any{
			"PERSONAL_TASK_DUE", fmt.Sprintf("drain:%d", i), userID, "EMAIL", 1, scheduled,
			fmt.Sprintf(`{"subject":"Drain %d","body":"Body %d"}`, i, i),
		})
	}
	if _, err := d.pool.CopyFrom(d.ctx, pgx.Identifier{"notifications"},
		[]string{"notification_type", "logical_key", "recipient_user_id", "requested_channel",
			"notification_content_version", "scheduled_at", "payload_json"},
		pgx.CopyFromRows(rows)); err != nil {
		t.Fatalf("seeding the queue: %v", err)
	}
	return userID
}

func (d *drainRig) pendingCount(t *testing.T) int {
	t.Helper()
	var count int
	if err := d.pool.QueryRow(d.ctx,
		`SELECT count(*) FROM notifications WHERE status = 'PENDING'`).Scan(&count); err != nil {
		t.Fatalf("counting pending: %v", err)
	}
	return count
}

func (d *drainRig) sentCount(t *testing.T) int {
	t.Helper()
	var count int
	if err := d.pool.QueryRow(d.ctx,
		`SELECT count(*) FROM notifications WHERE status = 'SENT'`).Scan(&count); err != nil {
		t.Fatalf("counting sent: %v", err)
	}
	return count
}

func drainSize(t *testing.T) int {
	t.Helper()
	if raw := os.Getenv("DELIVERY_DRAIN_SIZE"); raw != "" {
		var n int
		if _, err := fmt.Sscanf(raw, "%d", &n); err == nil && n > 0 {
			return n
		}
	}
	return 1000
}

func TestQueueDrainsWithoutLatencyGrowth(t *testing.T) {
	total := drainSize(t)
	counter := &queryCounter{}
	pool := countingPool(t, counter)
	d := newDrainRig(t, pool, 100)
	d.seedPersonalQueue(t, total)

	if got := d.pendingCount(t); got != total {
		t.Fatalf("expected %d pending rows, got %d", total, got)
	}

	counter.n.Store(0)
	started := time.Now()
	var batches []time.Duration
	for d.pendingCount(t) > 0 {
		at := time.Now()
		svcdelivery.RunDeliveryOnce(d.delivery, d.ctx)
		batches = append(batches, time.Since(at))
		if len(batches) > total {
			t.Fatalf("the queue did not drain after %d batches", len(batches))
		}
	}
	elapsed := time.Since(started)
	queries := counter.n.Load()

	if got := d.sentCount(t); got != total {
		t.Fatalf("expected %d sent rows, got %d", total, got)
	}
	if d.email.count() != total {
		t.Fatalf("expected %d provider calls, got %d", total, d.email.count())
	}

	first, last := batches[0], batches[len(batches)-1]
	t.Logf("drained %d notifications in %v across %d batches (%.2f ms per notification)",
		total, elapsed, len(batches), float64(elapsed.Milliseconds())/float64(total))
	t.Logf("first batch %v, last batch %v, %d queries total (%.2f per notification)",
		first, last, queries, float64(queries)/float64(total))

	if last > 4*first+50*time.Millisecond {
		t.Fatalf("per-batch latency grew from %v to %v: the drain is not flat", first, last)
	}
}

func TestDrainQueryCountStaysConstantPerNotification(t *testing.T) {
	const small, large = 50, 200

	counter := &queryCounter{}
	pool := countingPool(t, counter)

	measure := func(t *testing.T, total int) float64 {
		t.Helper()
		if _, err := pool.Exec(context.Background(),
			`TRUNCATE notifications, users CASCADE`); err != nil {
			t.Fatalf("clearing between measurements: %v", err)
		}
		d := newDrainRig(t, pool, total)
		d.seedPersonalQueue(t, total)

		counter.n.Store(0)
		for d.pendingCount(t) > 0 {
			svcdelivery.RunDeliveryOnce(d.delivery, d.ctx)
		}
		queries := counter.n.Load()
		if got := d.sentCount(t); got != total {
			t.Fatalf("expected %d sent rows, got %d", total, got)
		}
		per := float64(queries) / float64(total)
		t.Logf("draining %d notifications issued %d queries (%.2f per notification)", total, queries, per)
		if per < 1 {
			t.Fatalf("suspiciously low query count %d for %d notifications: the counter is not wired up",
				queries, total)
		}
		return per
	}

	perSmall := measure(t, small)
	perLarge := measure(t, large)

	if perLarge > perSmall*1.25+0.5 {
		t.Fatalf("per-notification query count grew from %.2f at %d to %.2f at %d: the path is N+1",
			perSmall, small, perLarge, large)
	}
}
