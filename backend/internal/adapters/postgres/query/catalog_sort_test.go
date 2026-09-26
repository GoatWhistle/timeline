package query

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestCatalogOrderSQLUsesWhitelistedColumns(t *testing.T) {
	cases := map[models.CatalogSort]string{
		{Field: models.CatalogSortStartAt, Direction: models.CatalogSortAsc}:   "e.start_at ASC, lower(e.title) ASC",
		{Field: models.CatalogSortStartAt, Direction: models.CatalogSortDesc}:  "e.start_at DESC, lower(e.title) ASC",
		{Field: models.CatalogSortEndAt, Direction: models.CatalogSortAsc}:     "e.end_at ASC, lower(e.title) ASC",
		{Field: models.CatalogSortEndAt, Direction: models.CatalogSortDesc}:    "e.end_at DESC, lower(e.title) ASC",
		{Field: models.CatalogSortTitle, Direction: models.CatalogSortAsc}:     "lower(e.title) ASC, e.start_at ASC",
		{Field: models.CatalogSortTitle, Direction: models.CatalogSortDesc}:    "lower(e.title) DESC, e.start_at ASC",
		{Field: models.CatalogSortDuration, Direction: models.CatalogSortAsc}:  "(e.end_at - e.start_at) ASC, lower(e.title) ASC",
		{Field: models.CatalogSortDuration, Direction: models.CatalogSortDesc}: "(e.end_at - e.start_at) DESC, lower(e.title) ASC",
	}
	for sort, want := range cases {
		if got := catalogOrderSQL(sort); got != want {
			t.Fatalf("sort %+v: got %q, want %q", sort, got, want)
		}
	}
}

func TestCatalogOrderSQLIgnoresUnknownField(t *testing.T) {
	got := catalogOrderSQL(models.CatalogSort{
		Field:     models.CatalogSortField("start_at; DROP TABLE events"),
		Direction: models.CatalogSortAsc,
	})
	if strings.Contains(got, "DROP") {
		t.Fatalf("an unknown sort field reached the SQL: %q", got)
	}
	if got != "e.start_at ASC, lower(e.title) ASC" {
		t.Fatalf("an unknown sort field must fall back to the default, got %q", got)
	}
}

func TestCatalogOrderSQLIgnoresUnknownDirection(t *testing.T) {
	got := catalogOrderSQL(models.CatalogSort{
		Field:     models.CatalogSortStartAt,
		Direction: models.CatalogSortDirection("ASC; DROP TABLE events"),
	})
	if strings.Contains(got, "DROP") {
		t.Fatalf("an unknown sort direction reached the SQL: %q", got)
	}
	if got != "e.start_at ASC, lower(e.title) ASC" {
		t.Fatalf("an unknown sort direction must fall back to ASC, got %q", got)
	}
}
