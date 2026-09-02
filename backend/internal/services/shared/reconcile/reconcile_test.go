package reconcile_test

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/reconcile"
)

func TestCandidateCarriesTheRecipientLanguageAndZone(t *testing.T) {
	now := time.Date(2026, 9, 1, 12, 0, 0, 0, time.UTC)
	event := &models.Event{ID: uuid.New(), Title: "Autumn hackathon", EndAt: now.Add(48 * time.Hour)}
	registration := &models.Registration{ID: uuid.New(), URL: "https://example.com/register",
		DeadlineAt: now.Add(24 * time.Hour)}
	participant := &models.EventParticipant{ID: uuid.New()}
	user := &models.User{ID: uuid.New(), Locale: "en", Timezone: "Asia/Tokyo"}

	candidate := reconcile.BuildCandidate(event, registration, participant, uuid.New(), 1, user)

	if candidate.RecipientLocale != user.Locale {
		t.Fatalf("the candidate carries locale %q instead of the recipient's %q: the primary "+
			"notification created inside the assignment transaction would be rendered in the "+
			"wrong language", candidate.RecipientLocale, user.Locale)
	}
	if candidate.RecipientTimezone != user.Timezone {
		t.Fatalf("the candidate carries timezone %q instead of the recipient's %q: the deadline "+
			"snapshot would name a zone the recipient does not live in",
			candidate.RecipientTimezone, user.Timezone)
	}
}
