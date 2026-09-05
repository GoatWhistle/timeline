//go:build integration

package apitest_test

import (
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestWorkerHeartbeatIsAdminOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, s.Client(t).Get("/ops/worker-heartbeat"), http.StatusUnauthorized,
		"reading the worker heartbeat without signing in")
	for name, acc := range map[string]support.Account{"a member": f.Member, "an outsider": f.Outsider} {
		support.RequireStatus(t, s.Session(t, acc).Get("/ops/worker-heartbeat"), http.StatusForbidden,
			"reading the worker heartbeat as "+name)
	}

	resp := f.AdminClient.Get("/ops/worker-heartbeat")
	if resp.Status != http.StatusOK && resp.Status != http.StatusServiceUnavailable {
		t.Fatalf("an administrator reading the heartbeat got %d, want 200 or 503", resp.Status)
	}
}

func TestWorkerHeartbeatDoesNotLeakQueueDepthToAnonymousCallers(t *testing.T) {
	s := support.NewStack(t)
	s.Seed(t)

	resp := s.Client(t).Get("/ops/worker-heartbeat")
	for _, field := range []string{"pending_count", "failed_count", "undeliverable_count",
		"processing_count", "oldest_pending_age_seconds", "scheduler_last_run_at"} {
		support.RequireNoBodyField(t, resp, field, "the anonymous worker heartbeat")
	}
}
