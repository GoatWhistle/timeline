package models_test

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestNicknameFormatAcceptsGithubShapedNames(t *testing.T) {
	for _, valid := range []string{"abc", "jsmith", "j-smith", "j_smith", "a1b2c3",
		strings.Repeat("a", 39)} {
		if !models.NicknameFormatValid(valid) {
			t.Fatalf("nickname %q must be accepted", valid)
		}
	}
}

func TestNicknameFormatRejectsBadShapes(t *testing.T) {
	for _, invalid := range []string{"", "ab", strings.Repeat("a", 40), "-lead", "trail-",
		"_lead", "trail_", "has space", "has.dot", "non-latin-\u0438\u043c\u044f", "at@sign"} {
		if models.NicknameFormatValid(invalid) {
			t.Fatalf("nickname %q must be rejected", invalid)
		}
	}
}

func TestReservedNicknamesCoverApplicationRoutes(t *testing.T) {
	for _, route := range []string{
		"admin", "api", "settings", "login", "register", "profile", "events",
		"catalog", "schedule", "invite", "invites", "me", "auth", "docs",
		"forgot-password", "reset-password", "verify-email", "email-change",
		"forbidden", "healthz", "readyz", "metrics", "calendar", "realtime",
	} {
		if !models.NicknameReserved(route) {
			t.Fatalf("route %q must be reserved as a nickname", route)
		}
	}
}

func TestReservedNicknameCheckIgnoresCase(t *testing.T) {
	if !models.NicknameReserved("ADMIN") || !models.NicknameReserved(" Admin ") {
		t.Fatal("the reserved check must ignore case and surrounding spaces")
	}
}

func TestOrdinaryNicknameIsNotReserved(t *testing.T) {
	if models.NicknameReserved("jsmith") {
		t.Fatal("an ordinary nickname must not be reserved")
	}
}

func TestNormalizeNicknameLowercasesAndTrims(t *testing.T) {
	if got := models.NormalizeNickname("  JSmith  "); got != "jsmith" {
		t.Fatalf("normalised nickname = %q, want %q", got, "jsmith")
	}
}

func TestNicknameHoldIsAMonth(t *testing.T) {
	if models.NicknameHold.Hours() != 30*24 {
		t.Fatalf("nickname hold = %v, want 30 days", models.NicknameHold)
	}
}
