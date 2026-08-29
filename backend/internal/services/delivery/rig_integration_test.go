//go:build integration

package delivery_test

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/models"
	svcdelivery "github.com/GoatWhistle/timeline/internal/services/delivery"
	svcnotification "github.com/GoatWhistle/timeline/internal/services/notification"
	svcscheduler "github.com/GoatWhistle/timeline/internal/services/scheduler"
)

type rig struct {
	world     *world
	notifs    *notification.Notifications
	scheduler *notification.Scheduler
	notifier  *svcnotification.NotificationService
	planner   *svcscheduler.SchedulerService
	delivery  *svcdelivery.DeliveryService
	telegram  *recordingSender
	email     *recordingSender
	clock     *testClock
}

type testClock struct {
	at time.Time
}

func (c *testClock) Now() time.Time { return c.at }

func (c *testClock) Advance(d time.Duration) { c.at = c.at.Add(d) }

func newRig(t *testing.T, w *world, telegram, email *recordingSender) *rig {
	t.Helper()
	notifs := notification.NewNotifications(w.db)
	scheduler := notification.NewScheduler(w.db)
	notifier := svcnotification.NewNotificationService(notifs, w.cfg)
	planner := svcscheduler.NewSchedulerService(w.db, scheduler, participation.NewRules(w.db), participation.NewStatuses(w.db), notifier, w.cfg)
	delivery := svcdelivery.NewDeliveryService(w.db, notifs, scheduler,
		identity.NewUsers(w.db), participation.NewRules(w.db), audit.NewAudit(w.db),
		telegram, email, w.cfg)

	clock := &testClock{at: time.Now().UTC()}
	svcnotification.SetNotificationClock(notifier, clock.Now)
	svcscheduler.SetSchedulerClock(planner, clock.Now)
	svcdelivery.SetDeliveryClock(delivery, clock.Now)

	return &rig{world: w, notifs: notifs, scheduler: scheduler, notifier: notifier,
		planner: planner, delivery: delivery, telegram: telegram, email: email, clock: clock}
}

func (r *rig) reconcile() *svcscheduler.ReconcileResult {
	r.world.t.Helper()
	result, err := r.planner.Run(r.world.ctx)
	if err != nil {
		r.world.t.Fatalf("reconciliation failed: %v", err)
	}
	return result
}

func (r *rig) work() {
	r.world.t.Helper()
	svcdelivery.RunDeliveryOnce(r.delivery, r.world.ctx)
}

func (r *rig) recover() {
	r.world.t.Helper()
	svcdelivery.RecoverDeliveryLeases(r.delivery, r.world.ctx)
}

func (r *rig) load(id uuid.UUID) *models.Notification {
	r.world.t.Helper()
	n, err := r.notifs.GetByID(r.world.ctx, id)
	if err != nil {
		r.world.t.Fatalf("loading notification: %v", err)
	}
	return n
}

func (r *rig) byKey(key string) *models.Notification {
	r.world.t.Helper()
	n, err := r.notifs.GetByLogicalKey(r.world.ctx, key)
	if err != nil {
		r.world.t.Fatalf("loading notification %s: %v", key, err)
	}
	return n
}

func (r *rig) only() *models.Notification {
	r.world.t.Helper()
	list, err := r.notifs.ListByStatus(r.world.ctx, r.world.StatusID)
	if err != nil {
		r.world.t.Fatalf("listing notifications: %v", err)
	}
	if len(list) != 1 {
		r.world.t.Fatalf("expected exactly one notification, got %d", len(list))
	}
	return &list[0]
}

func (r *rig) primaryKey() string {
	r.world.t.Helper()
	var assignment, activation, content int
	err := r.world.pool.QueryRow(r.world.ctx, `
		SELECT p.assignment_version, r.activation_version, r.notification_content_version
		FROM event_participants p, registrations r
		WHERE p.id = $1 AND r.id = $2`, r.world.ParticipantID, r.world.RegistrationID).
		Scan(&assignment, &activation, &content)
	if err != nil {
		r.world.t.Fatalf("reading versions: %v", err)
	}
	return svcnotification.PrimaryKey(r.world.ParticipantID, assignment, activation, content)
}

func (r *rig) ruleKey(kind models.NotificationType, ruleID uuid.UUID) string {
	r.world.t.Helper()
	var schedule, content, cycle int
	err := r.world.pool.QueryRow(r.world.ctx, `
		SELECT r.schedule_version, r.notification_content_version, s.todo_cycle
		FROM registrations r, registration_statuses s
		WHERE r.id = $1 AND s.id = $2`, r.world.RegistrationID, r.world.StatusID).
		Scan(&schedule, &content, &cycle)
	if err != nil {
		r.world.t.Fatalf("reading versions: %v", err)
	}
	return svcnotification.RuleKey(kind, r.world.StatusID, ruleID, schedule, cycle, content)
}

func requireStatus(t *testing.T, n *models.Notification, want models.NotificationStatus) {
	t.Helper()
	if n.Status != want {
		reason := ""
		if n.LastError != nil {
			reason = " (" + *n.LastError + ")"
		}
		t.Fatalf("expected status %s, got %s%s", want, n.Status, reason)
	}
}

func requireAttempts(t *testing.T, n *models.Notification, want int) {
	t.Helper()
	if n.AttemptCount != want {
		t.Fatalf("expected attempt_count %d, got %d", want, n.AttemptCount)
	}
}

func requireChannel(t *testing.T, n *models.Notification, want models.Channel) {
	t.Helper()
	if n.ActualChannel == nil {
		t.Fatalf("expected actual_channel %s, got none", want)
	}
	if *n.ActualChannel != want {
		t.Fatalf("expected actual_channel %s, got %s", want, *n.ActualChannel)
	}
}
