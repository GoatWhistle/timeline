//go:build integration

package profiletest_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

const emailChangeAttempts = 40

func TestEmailChangeIsRateLimitedLikeItsSiblingProfileWrite(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	throttled := false
	for i := 0; i < emailChangeAttempts; i++ {
		resp := member.Post("/me/email-change", map[string]string{
			"new_email":        fmt.Sprintf("probe%d@example.com", i),
			"current_password": "definitely-not-the-password",
		})
		if resp.Status == http.StatusTooManyRequests {
			throttled = true
			break
		}
	}
	if !throttled {
		t.Fatalf("POST /me/email-change served %d unauthenticated-password attempts without a 429: "+
			"each one runs a full Argon2id verification and mails an attacker-chosen address",
			emailChangeAttempts)
	}
}

func TestProfileUpdateStaysRateLimited(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	member := s.Session(t, f.Member)

	throttled := false
	for i := 0; i < emailChangeAttempts; i++ {
		resp := member.Patch("/me", map[string]string{"first_name": "Probe"})
		if resp.Status == http.StatusTooManyRequests {
			throttled = true
			break
		}
	}
	if !throttled {
		t.Fatalf("PATCH /me served %d writes without a 429: the profile limiter is not wired",
			emailChangeAttempts)
	}
}
