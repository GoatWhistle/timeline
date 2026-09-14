//go:build integration

package apitest_test

import (
	"context"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func countNotifications(s *support.Stack, t *testing.T) int {
	t.Helper()
	var count int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM notifications`).Scan(&count); err != nil {
		t.Fatalf("counting notifications: %v", err)
	}
	return count
}

func countAudit(s *support.Stack, t *testing.T) int {
	t.Helper()
	var count int
	if err := s.DB().Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM audit_log`).Scan(&count); err != nil {
		t.Fatalf("counting audit entries: %v", err)
	}
	return count
}

func setLocale(s *support.Stack, t *testing.T, userID string, value string) {
	t.Helper()
	if _, err := s.DB().Pool().Exec(context.Background(),
		`UPDATE users SET locale = $2 WHERE display_id = $1`, userID, value); err != nil {
		t.Fatalf("setting the locale of %s to %s: %v", userID, value, err)
	}
}

func logicalKeys(s *support.Stack, t *testing.T, statusID string) []string {
	t.Helper()
	rows, err := s.DB().Pool().Query(context.Background(),
		`SELECT logical_key FROM notifications
		 WHERE registration_status_id = (SELECT id FROM registration_statuses WHERE display_id = $1)
		 ORDER BY logical_key`,
		statusID)
	if err != nil {
		t.Fatalf("reading the logical keys of %s: %v", statusID, err)
	}
	defer rows.Close()

	var keys []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			t.Fatalf("scanning a logical key: %v", err)
		}
		keys = append(keys, key)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("reading the logical keys of %s: %v", statusID, err)
	}
	return keys
}

func contains(items []string, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}
