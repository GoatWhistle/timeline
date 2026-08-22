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
			t.Fatalf("попытка %d должна укладываться в лимит", i)
		}
	}
	if limiter.Allow("ip|user@example.com", 10, 15*time.Minute) {
		t.Fatal("одиннадцатая попытка должна быть отклонена")
	}

	// Другой ключ считается отдельно.
	if !limiter.Allow("ip|other@example.com", 10, 15*time.Minute) {
		t.Fatal("другой ключ не должен зависеть от исчерпанного")
	}

	// После окна счётчик обнуляется.
	now = now.Add(16 * time.Minute)
	if !limiter.Allow("ip|user@example.com", 10, 15*time.Minute) {
		t.Fatal("после окна попытка должна быть разрешена")
	}
}

func TestLimiterReset(t *testing.T) {
	now := time.Now()
	limiter := ratelimit.NewWithClock(func() time.Time { return now })

	for i := 0; i < 5; i++ {
		limiter.Allow("key", 5, time.Hour)
	}
	if limiter.Allow("key", 5, time.Hour) {
		t.Fatal("лимит должен быть исчерпан")
	}
	limiter.Reset("key")
	if !limiter.Allow("key", 5, time.Hour) {
		t.Fatal("после сброса попытка должна быть разрешена")
	}
}
