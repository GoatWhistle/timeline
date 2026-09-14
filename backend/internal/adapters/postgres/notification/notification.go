package notification

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Notifications struct{ db *postgres.DB }

func NewNotifications(db *postgres.DB) *Notifications {
	return &Notifications{db: db}
}

const notificationColumns = `id, display_id, notification_type, recipient_user_id, registration_status_id,
	event_id, stage_id, schedule_version, todo_cycle, assignment_version, activation_version,
	reminder_days_before, reminder_schedule_version, notification_content_version,
	logical_key, requested_channel, actual_channel, failed_channels, status, scheduled_at,
	next_attempt_at, attempt_count, lease_expires_at, provider_call_started_at, payload_json,
	last_error, sent_at, created_at, updated_at`

func scanNotification(row pgx.Row) (*models.Notification, error) {
	var (
		n       models.Notification
		failed  []string
		payload []byte
	)
	err := row.Scan(&n.ID, &n.DisplayID, &n.NotificationType, &n.RecipientUserID, &n.RegistrationStatusID,
		&n.EventID, &n.StageID, &n.ScheduleVersion, &n.TodoCycle, &n.AssignmentVersion, &n.ActivationVersion,
		&n.ReminderDaysBefore, &n.ReminderScheduleVersion, &n.NotificationContentVersion,
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

func (r *Notifications) Insert(ctx context.Context, n *models.Notification) (*models.Notification, bool, error) {
	payload, err := json.Marshal(n.Payload)
	if err != nil {
		return nil, false, err
	}
	row := r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id, event_id, stage_id,
			schedule_version, todo_cycle, assignment_version, activation_version,
			reminder_days_before, reminder_schedule_version,
			notification_content_version, logical_key, requested_channel, status,
			scheduled_at, next_attempt_at, payload_json)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'PENDING', $15, $16, $17)
		ON CONFLICT (logical_key) DO NOTHING
		RETURNING `+notificationColumns,
		n.NotificationType, n.RecipientUserID, n.RegistrationStatusID, n.EventID, n.StageID,
		n.ScheduleVersion, n.TodoCycle, n.AssignmentVersion, n.ActivationVersion,
		n.ReminderDaysBefore, n.ReminderScheduleVersion,
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

func (r *Notifications) GetByID(ctx context.Context, id uuid.UUID) (*models.Notification, error) {
	return scanNotification(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+notificationColumns+` FROM notifications WHERE id = $1`, id))
}

func (r *Notifications) GetByLogicalKey(ctx context.Context, key string) (*models.Notification, error) {
	return scanNotification(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+notificationColumns+` FROM notifications WHERE logical_key = $1`, key))
}

func (r *Notifications) ListByStatus(ctx context.Context, statusID uuid.UUID) ([]models.Notification, error) {
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
