package notification

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (r *Notifications) ClaimDue(ctx context.Context, limit int, lease time.Duration, now time.Time) ([]models.Notification, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		WITH due AS (
			SELECT id FROM notifications
			WHERE status = 'PENDING' AND coalesce(next_attempt_at, scheduled_at) <= $1
			ORDER BY coalesce(next_attempt_at, scheduled_at)
			LIMIT $2
			FOR UPDATE SKIP LOCKED
		)
		UPDATE notifications n SET
			status = 'PROCESSING',
			lease_expires_at = $1 + $3::interval,
			provider_call_started_at = NULL
		FROM due
		WHERE n.id = due.id
		RETURNING `+prefixColumns("n."), now, limit, lease.String())
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	return collectNotifications(rows)
}

func (r *Notifications) StartProviderCall(ctx context.Context, id uuid.UUID, channel models.Channel, now time.Time) (bool, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			provider_call_started_at = $3,
			actual_channel = $2,
			attempt_count = attempt_count + 1
		WHERE id = $1 AND status = 'PROCESSING' AND provider_call_started_at IS NULL`, id, channel, now)
	if err != nil {
		return false, mapError(err)
	}
	return tag.RowsAffected() == 1, nil
}

func (r *Notifications) ResetProviderCall(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE notifications SET provider_call_started_at = NULL WHERE id = $1 AND status = 'PROCESSING'`, id)
	return mapError(err)
}

func (r *Notifications) MarkSent(ctx context.Context, id uuid.UUID, channel models.Channel, now time.Time) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'SENT', actual_channel = $2, sent_at = $3,
			next_attempt_at = NULL, lease_expires_at = NULL, last_error = NULL
		WHERE id = $1`, id, channel, now)
	return mapError(err)
}

func (r *Notifications) MarkRetry(ctx context.Context, id uuid.UUID, nextAttempt time.Time, reason string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'PENDING', next_attempt_at = $2, lease_expires_at = NULL,
			provider_call_started_at = NULL, last_error = $3
		WHERE id = $1`, id, nextAttempt, reason)
	return mapError(err)
}

func (r *Notifications) MarkFailed(ctx context.Context, id uuid.UUID, reason string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'FAILED', next_attempt_at = NULL, lease_expires_at = NULL, last_error = $2
		WHERE id = $1`, id, reason)
	return mapError(err)
}

func (r *Notifications) MarkUndeliverable(ctx context.Context, id uuid.UUID, reason string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'UNDELIVERABLE', next_attempt_at = NULL, lease_expires_at = NULL, last_error = $2
		WHERE id = $1`, id, reason)
	return mapError(err)
}

func (r *Notifications) MarkCancelled(ctx context.Context, id uuid.UUID, reason string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'CANCELLED', next_attempt_at = NULL, lease_expires_at = NULL, last_error = $2
		WHERE id = $1 AND provider_call_started_at IS NULL`, id, reason)
	return mapError(err)
}

func (r *Notifications) AddFailedChannel(ctx context.Context, id uuid.UUID, channel models.Channel) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET failed_channels = array_append(failed_channels, $2)
		WHERE id = $1 AND NOT ($2 = ANY(failed_channels))`, id, string(channel))
	return mapError(err)
}

func (r *Notifications) RecoverLeases(ctx context.Context, now time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'PENDING',
			next_attempt_at = $1,
			lease_expires_at = NULL,
			provider_call_started_at = NULL,
			last_error = 'worker lease expired, entry returned to the queue'
		WHERE status = 'PROCESSING' AND lease_expires_at IS NOT NULL AND lease_expires_at < $1`, now)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

func (r *Notifications) CleanupPayloads(ctx context.Context, before time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET payload_json = NULL
		WHERE payload_json IS NOT NULL AND created_at < $1`, before)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

type QueueStats struct {
	Pending           int64
	Processing        int64
	Failed            int64
	Undeliverable     int64
	Sent              int64
	OldestPendingAgeS float64
	StuckLeases       int64
}

func (r *Notifications) Stats(ctx context.Context, now time.Time) (*QueueStats, error) {
	var s QueueStats
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT
			count(*) FILTER (WHERE status = 'PENDING'),
			count(*) FILTER (WHERE status = 'PROCESSING'),
			count(*) FILTER (WHERE status = 'FAILED'),
			count(*) FILTER (WHERE status = 'UNDELIVERABLE'),
			count(*) FILTER (WHERE status = 'SENT'),
			coalesce(extract(epoch FROM $1 - min(coalesce(next_attempt_at, scheduled_at))
				FILTER (WHERE status = 'PENDING')), 0),
			count(*) FILTER (WHERE status = 'PROCESSING' AND lease_expires_at < $1)
		FROM notifications`, now).
		Scan(&s.Pending, &s.Processing, &s.Failed, &s.Undeliverable, &s.Sent, &s.OldestPendingAgeS, &s.StuckLeases)
	if err != nil {
		return nil, mapError(err)
	}
	return &s, nil
}
