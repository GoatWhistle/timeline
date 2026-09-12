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

	var ruleID string
	if err := pool.QueryRow(ctx, `
		INSERT INTO notification_rules (registration_id, offset_minutes, slot_no)
		VALUES ((SELECT registration_id FROM registration_statuses WHERE id = $1), 60, 9)
		RETURNING id`, statusID).Scan(&ruleID); err != nil {
		t.Fatalf("creating a rule to attach: %v", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id, rule_id,
			notification_content_version, logical_key, requested_channel, scheduled_at)
		VALUES ('WEEKLY_DIGEST', $1, NULL, $2, 1, 'personal-digest:carries-rule', 'EMAIL', now())`,
		userID, ruleID)
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
