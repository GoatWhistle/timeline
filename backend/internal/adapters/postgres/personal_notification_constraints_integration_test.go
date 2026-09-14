//go:build integration

package postgres_test

import (
	"context"
	"testing"

	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestPersonalNotificationRejectsARegistrationStatus(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	statusID, userID := seedStatus(t, pool)

	_, err := pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			notification_content_version, logical_key, requested_channel, scheduled_at)
		VALUES ('PERSONAL_TASK_DUE', $1, $2, 1, 'personal-task:carries-status', 'EMAIL', now())`,
		userID, statusID)
	requireConstraint(t, err, "notifications_versions_by_type")

	_, err = pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id, reminder_days_before,
			notification_content_version, logical_key, requested_channel, scheduled_at)
		VALUES ('WEEKLY_DIGEST', $1, NULL, 3, 1, 'personal-digest:carries-days', 'EMAIL', now())`,
		userID)
	requireConstraint(t, err, "notifications_versions_by_type")

	if _, err := pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			notification_content_version, logical_key, requested_channel, scheduled_at)
		VALUES ('PERSONAL_RETROSPECTIVE_DUE', $1, NULL, 1, 'personal-retro:clean', 'EMAIL', now())`,
		userID); err != nil {
		t.Fatalf("a personal notification with no registration fields should be accepted: %v", err)
	}
}
