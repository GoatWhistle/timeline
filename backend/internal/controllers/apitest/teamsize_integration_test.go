//go:build integration

package apitest_test

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func TestEventRejectsAMinimumTeamSizeAboveTheMaximum(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	inverted := f.AdminClient.Post("/admin/events", map[string]any{
		"title":         "Impossible team " + strings.ReplaceAll(uuid.NewString(), "-", "")[:8],
		"start_at":      start.Format(time.RFC3339),
		"end_at":        start.Add(48 * time.Hour).Format(time.RFC3339),
		"team_size_min": 5,
		"team_size_max": 3,
	})
	requireErrorCode(t, inverted, http.StatusBadRequest, "validation_failed",
		"creating an event with a minimum above the maximum")
	requireFieldError(t, inverted, "team_size_min",
		"creating an event with a minimum above the maximum")

	requireErrorCode(t, f.AdminClient.Post("/admin/events", map[string]any{
		"title":         "Zero team " + strings.ReplaceAll(uuid.NewString(), "-", "")[:8],
		"start_at":      start.Format(time.RFC3339),
		"end_at":        start.Add(48 * time.Hour).Format(time.RFC3339),
		"team_size_min": 0,
	}), http.StatusBadRequest, "validation_failed", "creating an event with a minimum of zero")
}

func TestUpdatingOneTeamSizeBoundIsCheckedAgainstTheStoredOther(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(24 * time.Hour).Truncate(time.Second)

	resp := f.AdminClient.Post("/admin/events", map[string]any{
		"title":         "Bounded team " + strings.ReplaceAll(uuid.NewString(), "-", "")[:8],
		"start_at":      start.Format(time.RFC3339),
		"end_at":        start.Add(48 * time.Hour).Format(time.RFC3339),
		"team_size_min": 2,
		"team_size_max": 4,
	})
	support.RequireStatus(t, resp, http.StatusCreated, "creating a bounded event")
	var created struct {
		ID          string `json:"id"`
		TeamSizeMin *int   `json:"team_size_min"`
		TeamSizeMax *int   `json:"team_size_max"`
	}
	resp.Decode(t, &created)
	if created.TeamSizeMin == nil || *created.TeamSizeMin != 2 {
		t.Fatalf("the created event carries team_size_min %v instead of 2", created.TeamSizeMin)
	}

	raised := f.AdminClient.Patch("/admin/events/"+created.ID, map[string]any{"team_size_min": 6})
	requireErrorCode(t, raised, http.StatusBadRequest, "validation_failed",
		"raising the minimum past the stored maximum")
	requireFieldError(t, raised, "team_size_min", "raising the minimum past the stored maximum")

	lowered := f.AdminClient.Patch("/admin/events/"+created.ID, map[string]any{"team_size_max": 1})
	requireErrorCode(t, lowered, http.StatusBadRequest, "validation_failed",
		"lowering the maximum below the stored minimum")
	requireFieldError(t, lowered, "team_size_min", "lowering the maximum below the stored minimum")

	support.RequireStatus(t, f.AdminClient.Patch("/admin/events/"+created.ID,
		map[string]any{"team_size_min": 3}), http.StatusOK,
		"raising the minimum within the stored maximum")

	after := f.AdminClient.Get("/admin/events/" + created.ID)
	support.RequireStatus(t, after, http.StatusOK, "reading the event back")
	after.Decode(t, &created)
	if created.TeamSizeMin == nil || *created.TeamSizeMin != 3 {
		t.Fatalf("the accepted update left team_size_min at %v", created.TeamSizeMin)
	}
}

func requireFieldError(t *testing.T, resp support.Response, field, what string) {
	t.Helper()
	var body struct {
		Error struct {
			Fields []struct {
				Field string `json:"field"`
			} `json:"fields"`
		} `json:"error"`
	}
	resp.Decode(t, &body)
	for _, item := range body.Error.Fields {
		if item.Field == field {
			return
		}
	}
	t.Fatalf("%s: the error names no %q field, body %s", what, field, resp.Body)
}
