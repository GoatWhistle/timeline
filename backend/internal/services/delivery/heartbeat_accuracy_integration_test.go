//go:build integration

package delivery_test

import (
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/models"
	svcdelivery "github.com/GoatWhistle/timeline/internal/services/delivery"
)

func countStatus(t *testing.T, w *world, status string) int64 {
	t.Helper()
	var count int64
	if err := w.pool.QueryRow(w.ctx,
		`SELECT count(*) FROM notifications WHERE status = $1`, status).Scan(&count); err != nil {
		t.Fatalf("counting %s: %v", status, err)
	}
	return count
}

func TestHeartbeatCountsMatchTheDatabase(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	w.addRule(60, 1)
	w.addRule(120, 2)
	permanent := models.NewPermanentDeliveryError("the address does not exist", nil)
	temporary := models.NewTemporaryDeliveryError("provider is unavailable", nil)
	email := newSender(permanent, temporary, temporary, temporary, temporary)
	r := newRig(t, w, newSender(), email)
	r.clock.at = w.DeadlineAt.Add(-30 * time.Minute)
	r.reconcile()

	ops := svcdelivery.NewOpsService(w.db, notification.NewScheduler(w.db),
		notification.NewNotifications(w.db), w.cfg)
	svcdelivery.SetOpsClock(ops, r.clock.Now)

	for i := 0; i < 6; i++ {
		if i > 0 {
			r.clock.Advance(30 * time.Minute)
		}
		r.work()
	}

	hb, err := ops.Heartbeat(w.ctx)
	if err != nil {
		t.Fatalf("reading the heartbeat: %v", err)
	}

	for _, c := range []struct {
		name   string
		status string
		got    int64
	}{
		{"pending_count", "PENDING", hb.PendingCount},
		{"processing_count", "PROCESSING", hb.ProcessingCount},
		{"failed_count", "FAILED", hb.FailedCount},
		{"undeliverable_count", "UNDELIVERABLE", hb.UndeliverableCount},
	} {
		want := countStatus(t, w, c.status)
		if c.got != want {
			t.Fatalf("%s reported %d, the database holds %d rows in %s", c.name, c.got, want, c.status)
		}
	}
	if hb.FailedCount+hb.UndeliverableCount == 0 {
		t.Fatalf("the fixture produced no terminal rows, the comparison proves nothing")
	}
	t.Logf("heartbeat: pending=%d processing=%d failed=%d undeliverable=%d",
		hb.PendingCount, hb.ProcessingCount, hb.FailedCount, hb.UndeliverableCount)

	if hb.WorkerLastRunAt == nil {
		t.Fatalf("the worker ran but left no heartbeat")
	}
	if !hb.WorkerLastRunAt.Equal(r.clock.at) {
		t.Fatalf("worker_last_run_at is %v, the last worker run was at %v", hb.WorkerLastRunAt, r.clock.at)
	}
	var schedulerAt *time.Time
	if err := w.pool.QueryRow(w.ctx,
		`SELECT last_run_at FROM worker_heartbeats WHERE process = 'scheduler'`).Scan(&schedulerAt); err != nil {
		t.Fatalf("reading the scheduler heartbeat: %v", err)
	}
	if hb.SchedulerLastRunAt == nil || schedulerAt == nil || !hb.SchedulerLastRunAt.Equal(*schedulerAt) {
		t.Fatalf("scheduler_last_run_at is %v, the table holds %v", hb.SchedulerLastRunAt, schedulerAt)
	}
}

func TestHeartbeatOldestPendingAgeMatchesTheOldestPendingRow(t *testing.T) {
	w := newWorld(t)
	w.setChannels(false, true)
	temporary := models.NewTemporaryDeliveryError("provider is unavailable", nil)
	email := newSender(temporary)
	r, n := seedEmailDue(t, w, email)

	r.work()
	requireStatus(t, r.load(n.ID), models.NotificationPending)
	r.clock.Advance(90 * time.Minute)

	ops := svcdelivery.NewOpsService(w.db, notification.NewScheduler(w.db),
		notification.NewNotifications(w.db), w.cfg)
	svcdelivery.SetOpsClock(ops, r.clock.Now)
	hb, err := ops.Heartbeat(w.ctx)
	if err != nil {
		t.Fatalf("reading the heartbeat: %v", err)
	}

	after := r.load(n.ID)
	if after.NextAttemptAt == nil {
		t.Fatalf("the retried notification lost next_attempt_at")
	}
	want := r.clock.at.Sub(*after.NextAttemptAt).Seconds()
	if diff := hb.OldestPendingAgeS - want; diff > 1 || diff < -1 {
		t.Fatalf("oldest_pending_age_seconds is %.2f, the oldest pending row is %.2f seconds old",
			hb.OldestPendingAgeS, want)
	}
	t.Logf("oldest_pending_age_seconds=%.2f matches the queue", hb.OldestPendingAgeS)
}
