package ratelimit_test

import (
	"testing"
	"time"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/ratelimit"
)

func TestLimiterAllowsWithinWindow(t *testing.T) {
	now := time.Now()
	limiter := ratelimit.NewWithClock(func() time.Time { return now })

	for i := 1; i <= 10; i++ {
		if !limiter.Allow("ip|user@example.com", 10, 15*time.Minute) {
			t.Fatalf("attempt %d should stay within the limit", i)
		}
	}
	if limiter.Allow("ip|user@example.com", 10, 15*time.Minute) {
		t.Fatal("the eleventh attempt should be rejected")
	}

	if !limiter.Allow("ip|other@example.com", 10, 15*time.Minute) {
		t.Fatal("a different key should not depend on an exhausted one")
	}

	now = now.Add(16 * time.Minute)
	if !limiter.Allow("ip|user@example.com", 10, 15*time.Minute) {
		t.Fatal("after the window the attempt should be allowed")
	}
}

func TestLimiterReset(t *testing.T) {
	now := time.Now()
	limiter := ratelimit.NewWithClock(func() time.Time { return now })

	for i := 0; i < 5; i++ {
		limiter.Allow("key", 5, time.Hour)
	}
	if limiter.Allow("key", 5, time.Hour) {
		t.Fatal("the limit should be exhausted")
	}
	limiter.Reset("key")
	if !limiter.Allow("key", 5, time.Hour) {
		t.Fatal("after a reset the attempt should be allowed")
	}
}
