//go:build integration

package services_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type bus struct {
	db   *postgres.DB
	repo *systemevent.Events
	svc  *services.SystemEventService
}

func newBus(t *testing.T) *bus {
	t.Helper()
	db := testsupport.DB(t)
	repo := systemevent.NewEvents(db)
	return &bus{db: db, repo: repo, svc: services.NewSystemEventService(db, repo)}
}

func adminEvent(eventType models.SystemEventType, state string) services.EmitRequest {
	return services.EmitRequest{
		Type:     eventType,
		Severity: models.SeverityWarning,
		Audience: models.AudienceAdmin,
		Payload:  map[string]any{"state": state},
	}
}

func TestTransitionDedupCreatesOneEventPerStateChange(t *testing.T) {
	b := newBus(t)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		if _, err := b.svc.EmitOnTransition(ctx, "worker:health", "stalled",
			adminEvent(models.EventWorkerStalled, "stalled")); err != nil {
			t.Fatalf("observing a stalled worker: %v", err)
		}
	}

	page := models.Page{Number: 1, Size: 50}
	_, total, err := b.repo.List(ctx, uuid.New(), true, false, page)
	if err != nil {
		t.Fatalf("listing administrative events: %v", err)
	}
	if total != 1 {
		t.Fatalf("five observations of the same state produced %d events, expected one", total)
	}

	if _, err := b.svc.EmitOnTransition(ctx, "worker:health", "healthy",
		adminEvent(models.EventWorkerRecovered, "healthy")); err != nil {
		t.Fatalf("observing a recovered worker: %v", err)
	}
	if _, err := b.svc.EmitOnTransition(ctx, "worker:health", "stalled",
		adminEvent(models.EventWorkerStalled, "stalled")); err != nil {
		t.Fatalf("observing a stalled worker again: %v", err)
	}

	_, total, err = b.repo.List(ctx, uuid.New(), true, false, page)
	if err != nil {
		t.Fatalf("listing administrative events after the recovery: %v", err)
	}
	if total != 3 {
		t.Fatalf("expected one event per transition, got %d", total)
	}
}

func TestDedupKeyStopsConcurrentDuplicates(t *testing.T) {
	b := newBus(t)
	ctx := context.Background()
	subject := uuid.New()

	req := services.EmitRequest{
		Type:        models.EventNotificationFailed,
		Severity:    models.SeverityWarning,
		Audience:    models.AudienceAdmin,
		SubjectType: "notification",
		SubjectID:   &subject,
		DedupKey:    "NOTIFICATION_FAILED:" + subject.String(),
	}
	first, err := b.svc.Emit(ctx, req)
	if err != nil || first == nil {
		t.Fatalf("first emit: %v", err)
	}
	second, err := b.svc.Emit(ctx, req)
	if err != nil {
		t.Fatalf("second emit: %v", err)
	}
	if second != nil {
		t.Fatal("the same dedup key produced a second event")
	}
}

func TestListenNotifyCarriesIdentifiersOnly(t *testing.T) {
	b := newBus(t)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	signals := make(chan systemevent.Signal, 4)
	go func() {
		_ = b.repo.Listen(ctx, func(s systemevent.Signal) { signals <- s })
	}()
	time.Sleep(500 * time.Millisecond)

	secret := "a subject line nobody outside the recipient may read"
	stored, err := b.svc.Emit(ctx, services.EmitRequest{
		Type:     models.EventNotificationFailed,
		Severity: models.SeverityWarning,
		Audience: models.AudienceAdmin,
		Payload:  map[string]any{"subject": secret},
	})
	if err != nil || stored == nil {
		t.Fatalf("emitting an event: %v", err)
	}

	select {
	case signal := <-signals:
		if signal.EventID == nil || *signal.EventID != stored.ID {
			t.Fatalf("the channel did not carry the event identifier: %+v", signal)
		}
		if !signal.Admin {
			t.Fatalf("the administrative audience was lost: %+v", signal)
		}
		if len(signal.Keys) != 0 {
			t.Fatalf("the channel carried unexpected payload keys: %+v", signal)
		}
	case <-ctx.Done():
		t.Fatal("no notification arrived on the realtime channel")
	}
}

func TestRetentionRemovesEventRowsEntirely(t *testing.T) {
	b := newBus(t)
	ctx := context.Background()

	stored, err := b.svc.Emit(ctx, adminEvent(models.EventQueueAgeHigh, "high"))
	if err != nil || stored == nil {
		t.Fatalf("emitting an event: %v", err)
	}
	if _, err := b.db.Pool().Exec(ctx,
		`UPDATE system_events SET created_at = now() - interval '91 days' WHERE id = $1`,
		stored.ID); err != nil {
		t.Fatalf("ageing the event: %v", err)
	}

	removed, err := b.svc.Cleanup(ctx, 90*24*time.Hour)
	if err != nil {
		t.Fatalf("running retention: %v", err)
	}
	if removed != 1 {
		t.Fatalf("expected one row removed, got %d", removed)
	}
	if _, err := b.repo.GetByID(ctx, stored.ID); err == nil {
		t.Fatal("the row survived retention: events are removed in full, unlike notifications")
	}
}
