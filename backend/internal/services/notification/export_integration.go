//go:build integration

package notification

import "time"

func SetNotificationClock(s *NotificationService, now func() time.Time) { s.now = now }
