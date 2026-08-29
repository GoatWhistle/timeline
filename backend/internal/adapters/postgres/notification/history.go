package notification

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

const historyPreviewLimit = 160

func (r *Notifications) History(ctx context.Context, recipientID uuid.UUID,
	page models.Page) ([]models.NotificationHistoryItem, int64, error) {
	var total int64
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM notifications WHERE recipient_user_id = $1`, recipientID).Scan(&total)
	if err != nil {
		return nil, 0, mapError(err)
	}
	if total == 0 {
		return []models.NotificationHistoryItem{}, 0, nil
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT id, notification_type, status,
		       coalesce(actual_channel, requested_channel),
		       payload_json ->> 'event_title',
		       left(payload_json ->> 'subject', $4),
		       payload_json IS NULL OR payload_json = '{}'::jsonb,
		       scheduled_at, sent_at, created_at
		FROM notifications
		WHERE recipient_user_id = $1
		ORDER BY created_at DESC, id DESC
		LIMIT $2 OFFSET $3`,
		recipientID, page.Limit(), page.Offset(), historyPreviewLimit)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.NotificationHistoryItem, 0, page.Limit())
	for rows.Next() {
		var item models.NotificationHistoryItem
		if err := rows.Scan(&item.ID, &item.Type, &item.Status, &item.Channel,
			&item.EventTitle, &item.Preview, &item.Redacted,
			&item.ScheduledAt, &item.SentAt, &item.CreatedAt); err != nil {
			return nil, 0, mapError(err)
		}
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}
