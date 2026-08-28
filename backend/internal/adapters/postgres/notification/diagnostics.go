package notification

import (
	"context"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

type QueueScope string

const (
	ScopeFailures    QueueScope = "failures"
	ScopeStuckLeases QueueScope = "stuck-leases"
)

const failuresWhere = `status IN ('FAILED', 'UNDELIVERABLE') AND updated_at <= $1`

const stuckLeasesWhere = `status = 'PROCESSING' AND lease_expires_at IS NOT NULL AND lease_expires_at < $1`

func scopeWhere(scope QueueScope) string {
	if scope == ScopeStuckLeases {
		return stuckLeasesWhere
	}
	return failuresWhere
}

func (r *Notifications) CountByScope(ctx context.Context, scope QueueScope, now time.Time) (int64, error) {
	var total int64
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM notifications WHERE `+scopeWhere(scope), now).Scan(&total)
	if err != nil {
		return 0, mapError(err)
	}
	return total, nil
}

func (r *Notifications) ListByScope(ctx context.Context, scope QueueScope, now time.Time,
	limit, offset int) ([]models.Notification, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+notificationColumns+` FROM notifications
		WHERE `+scopeWhere(scope)+`
		ORDER BY updated_at DESC, id
		LIMIT $2 OFFSET $3`, now, limit, offset)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	return collectNotifications(rows)
}
