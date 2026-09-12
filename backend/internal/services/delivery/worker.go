package delivery

import (
	"context"
	"log/slog"
	"time"
)

func (s *DeliveryService) Start(ctx context.Context) {
	poll := time.NewTicker(s.cfg.Notify.WorkerInterval)
	defer poll.Stop()
	recovery := time.NewTicker(s.cfg.Notify.RecoveryInterval)
	defer recovery.Stop()
	watch := time.NewTicker(s.cfg.Notify.WorkerInterval)
	defer watch.Stop()
	retention := time.NewTicker(s.cfg.Retent.Interval)
	defer retention.Stop()

	s.runOnce(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-poll.C:
			s.runOnce(ctx)
		case <-recovery.C:
			s.recoverLeases(ctx)
		case <-watch.C:
			s.observe(ctx)
		case <-retention.C:
			s.cleanup(ctx)
		}
	}
}

func (s *DeliveryService) runOnce(ctx context.Context) {
	now := s.now()
	if err := s.scheduler.TouchHeartbeat(ctx, "worker", now); err != nil {
		slog.ErrorContext(ctx, "failed to update worker heartbeat", "error", err)
	}

	claimed, err := s.notifications.ClaimDue(ctx, s.cfg.Notify.WorkerBatch, s.cfg.Notify.LeaseTTL, now)
	if err != nil {
		slog.ErrorContext(ctx, "failed to claim queue entries", "error", err)
		return
	}
	for i := range claimed {
		if ctx.Err() != nil {
			return
		}
		if err := s.deliver(ctx, &claimed[i]); err != nil {
			slog.ErrorContext(ctx, "notification processing failed",
				"error", err, "notification_id", claimed[i].ID)
		}
	}
}

func (s *DeliveryService) recoverLeases(ctx context.Context) {
	count, err := s.notifications.RecoverLeases(ctx, s.now())
	if err != nil {
		slog.ErrorContext(ctx, "releasing expired leases failed", "error", err)
		return
	}
	if count > 0 {
		slog.InfoContext(ctx, "expired leases returned to queue", "count", count)
	}
}

func (s *DeliveryService) auditRetentionDays(ctx context.Context) int {
	days := int(s.cfg.Retent.AuditLog.Hours() / 24)
	if s.events == nil {
		return days
	}
	settings, err := s.events.GetRetentionSettings(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "reading retention settings failed, using the configured default", "error", err)
		return days
	}
	return settings.AuditLogRetentionDays
}

func (s *DeliveryService) cleanup(ctx context.Context) {
	now := s.now()
	payloads, err := s.notifications.CleanupPayloads(ctx, now.Add(-s.cfg.Retent.NotificationPayload))
	if err != nil {
		slog.ErrorContext(ctx, "notification payload cleanup failed", "error", err)
	}
	days := s.auditRetentionDays(ctx)
	var entries int64
	if err := s.db.WithTx(ctx, func(ctx context.Context) error {
		deleted, err := s.audit.DeleteOlderThan(ctx, days)
		if err != nil {
			return err
		}
		entries = deleted
		return nil
	}); err != nil {
		slog.ErrorContext(ctx, "audit log cleanup failed", "error", err)
	}
	var feed int64
	if s.feed != nil {
		feed, err = s.feed.Cleanup(ctx, s.cfg.Retent.SystemEvent)
		if err != nil {
			slog.ErrorContext(ctx, "system event cleanup failed", "error", err)
		}
	}
	if payloads > 0 || entries > 0 || feed > 0 {
		slog.InfoContext(ctx, "retention policy applied",
			"payloads", payloads, "audit_entries", entries, "system_events", feed)
	}
}
