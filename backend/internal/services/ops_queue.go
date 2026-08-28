package services

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *OpsService) Queue(ctx context.Context, actor models.Actor, scope string,
	page models.Page) ([]models.QueueEntryResponse, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the operation is restricted to administrators")
	}
	selected, err := queueScope(scope)
	if err != nil {
		return nil, 0, err
	}

	now := s.now()
	total, err := s.notifications.CountByScope(ctx, selected, now)
	if err != nil {
		return nil, 0, err
	}
	entries, err := s.notifications.ListByScope(ctx, selected, now, page.Limit(), page.Offset())
	if err != nil {
		return nil, 0, err
	}

	items := make([]models.QueueEntryResponse, 0, len(entries))
	for i := range entries {
		items = append(items, queueEntry(&entries[i], s))
	}
	return items, total, nil
}

func queueScope(scope string) (notification.QueueScope, error) {
	switch scope {
	case "", string(notification.ScopeFailures):
		return notification.ScopeFailures, nil
	case string(notification.ScopeStuckLeases):
		return notification.ScopeStuckLeases, nil
	}
	return "", models.NewValidation("scope must be failures or stuck-leases")
}

func queueEntry(n *models.Notification, s *OpsService) models.QueueEntryResponse {
	entry := models.QueueEntryResponse{
		ID:               n.ID,
		NotificationType: n.NotificationType,
		Status:           n.Status,
		RequestedChannel: n.RequestedChannel,
		ActualChannel:    n.ActualChannel,
		FailedChannels:   n.FailedChannels,
		AttemptCount:     n.AttemptCount,
		ScheduledAt:      n.ScheduledAt,
		LeaseExpiresAt:   n.LeaseExpiresAt,
		LastError:        n.LastError,
		CreatedAt:        n.CreatedAt,
		UpdatedAt:        n.UpdatedAt,
	}
	if n.Status == models.NotificationProcessing && n.LeaseExpiresAt != nil {
		overdue := s.now().Sub(*n.LeaseExpiresAt).Seconds()
		if overdue > 0 {
			entry.LeaseOverdueS = &overdue
		}
	}
	return entry
}
