package models_test

import (
	"errors"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestParseCatalogSortDefaults(t *testing.T) {
	sort, err := models.ParseCatalogSort("", "")
	if err != nil {
		t.Fatalf("empty sort must fall back to the default: %v", err)
	}
	if sort != models.DefaultCatalogSort {
		t.Fatalf("got %+v, want %+v", sort, models.DefaultCatalogSort)
	}
}

func TestParseCatalogSortAcceptsWhitelist(t *testing.T) {
	fields := []models.CatalogSortField{
		models.CatalogSortStartAt, models.CatalogSortEndAt, models.CatalogSortTitle,
		models.CatalogSortDuration,
	}
	directions := []models.CatalogSortDirection{models.CatalogSortAsc, models.CatalogSortDesc}

	for _, field := range fields {
		for _, direction := range directions {
			sort, err := models.ParseCatalogSort(string(field), string(direction))
			if err != nil {
				t.Fatalf("%s %s must be accepted: %v", field, direction, err)
			}
			if sort.Field != field || sort.Direction != direction {
				t.Fatalf("got %+v, want field %s direction %s", sort, field, direction)
			}
		}
	}
}

func TestParseCatalogSortRejectsUnknownField(t *testing.T) {
	cases := []string{
		"prize_pool",
		"e.start_at",
		"start_at; DROP TABLE events",
		"start_at, (SELECT 1)",
		"START_AT",
		"1",
	}
	for _, raw := range cases {
		if _, err := models.ParseCatalogSort(raw, ""); err == nil {
			t.Fatalf("sort field %q must be rejected, not passed through", raw)
		} else if !errors.Is(err, models.ErrValidation) {
			t.Fatalf("sort field %q must fail validation, got %v", raw, err)
		}
	}
}

func TestParseCatalogSortRejectsUnknownDirection(t *testing.T) {
	cases := []string{"ascending", "asc; DROP TABLE events", "ASC", "up"}
	for _, raw := range cases {
		if _, err := models.ParseCatalogSort("start_at", raw); err == nil {
			t.Fatalf("sort direction %q must be rejected, not passed through", raw)
		} else if !errors.Is(err, models.ErrValidation) {
			t.Fatalf("sort direction %q must fail validation, got %v", raw, err)
		}
	}
}

func TestDurationDaysCountsEveryStartedDay(t *testing.T) {
	day := func(d, h, m int) time.Time { return time.Date(2026, 8, d, h, m, 0, 0, time.UTC) }
	cases := []struct {
		name       string
		start, end time.Time
		want       int
	}{
		{"a full week", day(24, 0, 0), day(30, 23, 59), 7},
		{"one evening", day(24, 18, 0), day(24, 21, 0), 1},
		{"exactly two days", day(24, 0, 0), day(26, 0, 0), 2},
		{"a moment past two days", day(24, 0, 0), day(26, 0, 1), 3},
		{"an end before the start", day(26, 0, 0), day(24, 0, 0), 1},
	}
	for _, tc := range cases {
		if got := models.DurationDays(tc.start, tc.end); got != tc.want {
			t.Fatalf("%s: got %d days, want %d", tc.name, got, tc.want)
		}
	}
}
