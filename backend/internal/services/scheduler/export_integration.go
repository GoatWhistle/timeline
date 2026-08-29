//go:build integration

package scheduler

import "time"

func SetSchedulerClock(s *SchedulerService, now func() time.Time) { s.now = now }
