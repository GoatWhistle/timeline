package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/models"
)

type NotificationRepository struct{ db *DB }

func NewNotificationRepository(db *DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

const notificationColumns = `id, notification_type, recipient_user_id, registration_status_id, rule_id,
	schedule_version, todo_cycle, assignment_version, activation_version, notification_content_version,
	logical_key, requested_channel, actual_channel, failed_channels, status, scheduled_at,
	next_attempt_at, attempt_count, lease_expires_at, provider_call_started_at, payload_json,
	last_error, sent_at, created_at, updated_at`

func scanNotification(row pgx.Row) (*models.Notification, error) {
	var (
		n       models.Notification
		failed  []string
		payload []byte
	)
	err := row.Scan(&n.ID, &n.NotificationType, &n.RecipientUserID, &n.RegistrationStatusID, &n.RuleID,
		&n.ScheduleVersion, &n.TodoCycle, &n.AssignmentVersion, &n.ActivationVersion, &n.NotificationContentVersion,
		&n.LogicalKey, &n.RequestedChannel, &n.ActualChannel, &failed, &n.Status, &n.ScheduledAt,
		&n.NextAttemptAt, &n.AttemptCount, &n.LeaseExpiresAt, &n.ProviderCallStartedAt, &payload,
		&n.LastError, &n.SentAt, &n.CreatedAt, &n.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	n.FailedChannels = toChannels(failed)
	if len(payload) > 0 {
		var p models.NotificationPayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return nil, err
		}
		n.Payload = &p
	}
	return &n, nil
}

func toChannels(values []string) []models.Channel {
	if len(values) == 0 {
		return nil
	}
	out := make([]models.Channel, 0, len(values))
	for _, v := range values {
		out = append(out, models.Channel(v))
	}
	return out
}

func (r *NotificationRepository) Insert(ctx context.Context, n *models.Notification) (*models.Notification, bool, error) {
	payload, err := json.Marshal(n.Payload)
	if err != nil {
		return nil, false, err
	}
	row := r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id, rule_id,
			schedule_version, todo_cycle, assignment_version, activation_version,
			notification_content_version, logical_key, requested_channel, status,
			scheduled_at, next_attempt_at, payload_json)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12, $13, $14)
		ON CONFLICT (logical_key) DO NOTHING
		RETURNING `+notificationColumns,
		n.NotificationType, n.RecipientUserID, n.RegistrationStatusID, n.RuleID,
		n.ScheduleVersion, n.TodoCycle, n.AssignmentVersion, n.ActivationVersion,
		n.NotificationContentVersion, n.LogicalKey, n.RequestedChannel,
		n.ScheduledAt, n.NextAttemptAt, payload)

	created, err := scanNotification(row)
	if err == nil {
		return created, true, nil
	}
	if !errors.Is(err, models.ErrNotFound) {
		return nil, false, err
	}
	existing, err := r.GetByLogicalKey(ctx, n.LogicalKey)
	if err != nil {
		return nil, false, err
	}
	return existing, false, nil
}

func (r *NotificationRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Notification, error) {
	return scanNotification(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+notificationColumns+` FROM notifications WHERE id = $1`, id))
}

func (r *NotificationRepository) GetByLogicalKey(ctx context.Context, key string) (*models.Notification, error) {
	return scanNotification(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+notificationColumns+` FROM notifications WHERE logical_key = $1`, key))
}

func (r *NotificationRepository) ExistsLogicalKey(ctx context.Context, key string) (bool, error) {
	var exists bool
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM notifications WHERE logical_key = $1)`, key).Scan(&exists)
	if err != nil {
		return false, mapError(err)
	}
	return exists, nil
}

type CancelScope struct {
	StatusID       *uuid.UUID
	ParticipantID  *uuid.UUID
	RegistrationID *uuid.UUID
	EventID        *uuid.UUID
	RecipientID    *uuid.UUID
	Types          []models.NotificationType
}

func (r *NotificationRepository) CancelPending(ctx context.Context, scope CancelScope) (int64, error) {
	conds := []string{
		`(n.status = 'PENDING' OR (n.status = 'PROCESSING' AND n.provider_call_started_at IS NULL))`,
	}
	args := make([]any, 0, 4)
	join := ""

	if scope.StatusID != nil {
		args = append(args, *scope.StatusID)
		conds = append(conds, `n.registration_status_id = $`+itoa(len(args)))
	}
	if scope.ParticipantID != nil {
		args = append(args, *scope.ParticipantID)
		join = ` JOIN registration_statuses s ON s.id = n.registration_status_id`
		conds = append(conds, `s.participant_id = $`+itoa(len(args)))
	}
	if scope.RegistrationID != nil {
		args = append(args, *scope.RegistrationID)
		join = ` JOIN registration_statuses s ON s.id = n.registration_status_id`
		conds = append(conds, `s.registration_id = $`+itoa(len(args)))
	}
	if scope.EventID != nil {
		args = append(args, *scope.EventID)
		join = ` JOIN registration_statuses s ON s.id = n.registration_status_id`
		conds = append(conds, `s.event_id = $`+itoa(len(args)))
	}
	if scope.RecipientID != nil {
		args = append(args, *scope.RecipientID)
		conds = append(conds, `n.recipient_user_id = $`+itoa(len(args)))
	}
	if len(scope.Types) > 0 {
		types := make([]string, 0, len(scope.Types))
		for _, t := range scope.Types {
			types = append(types, string(t))
		}
		args = append(args, types)
		conds = append(conds, `n.notification_type = ANY($`+itoa(len(args))+`)`)
	}

	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET status = 'CANCELLED', next_attempt_at = NULL, lease_expires_at = NULL
		WHERE id IN (
			SELECT n.id FROM notifications n`+join+`
			WHERE `+strings.Join(conds, " AND ")+`
		)`, args...)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

func (r *NotificationRepository) ClaimDue(ctx context.Context, limit int, lease time.Duration, now time.Time) ([]models.Notification, error) {
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

func (r *NotificationRepository) StartProviderCall(ctx context.Context, id uuid.UUID, channel models.Channel, now time.Time) (bool, error) {
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

func (r *NotificationRepository) ResetProviderCall(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE notifications SET provider_call_started_at = NULL WHERE id = $1 AND status = 'PROCESSING'`, id)
	return mapError(err)
}

func (r *NotificationRepository) MarkSent(ctx context.Context, id uuid.UUID, channel models.Channel, now time.Time) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'SENT', actual_channel = $2, sent_at = $3,
			next_attempt_at = NULL, lease_expires_at = NULL, last_error = NULL
		WHERE id = $1`, id, channel, now)
	return mapError(err)
}

func (r *NotificationRepository) MarkRetry(ctx context.Context, id uuid.UUID, nextAttempt time.Time, reason string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'PENDING', next_attempt_at = $2, lease_expires_at = NULL,
			provider_call_started_at = NULL, last_error = $3
		WHERE id = $1`, id, nextAttempt, reason)
	return mapError(err)
}

func (r *NotificationRepository) MarkFailed(ctx context.Context, id uuid.UUID, reason string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'FAILED', next_attempt_at = NULL, lease_expires_at = NULL, last_error = $2
		WHERE id = $1`, id, reason)
	return mapError(err)
}

func (r *NotificationRepository) MarkUndeliverable(ctx context.Context, id uuid.UUID, reason string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'UNDELIVERABLE', next_attempt_at = NULL, lease_expires_at = NULL, last_error = $2
		WHERE id = $1`, id, reason)
	return mapError(err)
}

func (r *NotificationRepository) MarkCancelled(ctx context.Context, id uuid.UUID, reason string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET
			status = 'CANCELLED', next_attempt_at = NULL, lease_expires_at = NULL, last_error = $2
		WHERE id = $1 AND provider_call_started_at IS NULL`, id, reason)
	return mapError(err)
}

func (r *NotificationRepository) AddFailedChannel(ctx context.Context, id uuid.UUID, channel models.Channel) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET failed_channels = array_append(failed_channels, $2)
		WHERE id = $1 AND NOT ($2 = ANY(failed_channels))`, id, string(channel))
	return mapError(err)
}

func (r *NotificationRepository) RecoverLeases(ctx context.Context, now time.Time) (int64, error) {
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

func (r *NotificationRepository) CleanupPayloads(ctx context.Context, before time.Time) (int64, error) {
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

func (r *NotificationRepository) Stats(ctx context.Context, now time.Time) (*QueueStats, error) {
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

func (r *NotificationRepository) ListByStatus(ctx context.Context, statusID uuid.UUID) ([]models.Notification, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+notificationColumns+` FROM notifications
		WHERE registration_status_id = $1 ORDER BY created_at`, statusID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	return collectNotifications(rows)
}

func collectNotifications(rows pgx.Rows) ([]models.Notification, error) {
	items := make([]models.Notification, 0, 16)
	for rows.Next() {
		n, err := scanNotification(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *n)
	}
	return items, mapError(rows.Err())
}

func prefixColumns(prefix string) string {
	parts := strings.Split(notificationColumns, ",")
	for i, p := range parts {
		parts[i] = prefix + strings.TrimSpace(p)
	}
	return strings.Join(parts, ", ")
}
