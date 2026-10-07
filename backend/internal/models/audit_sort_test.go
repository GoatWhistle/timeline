package models_test

import (
	"errors"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestParseAuditSortDefaultsToNewestFirst(t *testing.T) {
	sort, err := models.ParseAuditSort("", "")
	if err != nil {
		t.Fatalf("an empty sort must fall back to the default: %v", err)
	}
	want := models.AuditSort{Field: models.AuditSortCreatedAt, Direction: models.CatalogSortDesc}
	if sort != want {
		t.Fatalf("got %+v, want %+v", sort, want)
	}
	onlyField, err := models.ParseAuditSort("action", "")
	if err != nil {
		t.Fatalf("a field without a direction must be accepted: %v", err)
	}
	if onlyField.Direction != models.CatalogSortDesc {
		t.Fatalf("a missing direction must stay descending, got %s", onlyField.Direction)
	}
}

func TestParseAuditSortAcceptsWhitelist(t *testing.T) {
	fields := []models.AuditSortField{
		models.AuditSortCreatedAt, models.AuditSortActor,
		models.AuditSortAction, models.AuditSortEntityType,
	}
	directions := []models.CatalogSortDirection{models.CatalogSortAsc, models.CatalogSortDesc}
	for _, field := range fields {
		for _, direction := range directions {
			sort, err := models.ParseAuditSort(string(field), string(direction))
			if err != nil {
				t.Fatalf("%s %s must be accepted: %v", field, direction, err)
			}
			if sort.Field != field || sort.Direction != direction {
				t.Fatalf("got %+v, want field %s direction %s", sort, field, direction)
			}
		}
	}
}

func TestParseAuditSortRejectsUnknownField(t *testing.T) {
	cases := []string{
		"email",
		"a.created_at",
		"created_at; DROP TABLE audit_log",
		"created_at, (SELECT 1)",
		"CREATED_AT",
		"1",
	}
	for _, raw := range cases {
		if _, err := models.ParseAuditSort(raw, ""); err == nil {
			t.Fatalf("sort field %q must be rejected, not passed through", raw)
		} else if !errors.Is(err, models.ErrValidation) {
			t.Fatalf("sort field %q must fail validation, got %v", raw, err)
		}
	}
}

func TestParseAuditSortRejectsUnknownDirection(t *testing.T) {
	cases := []string{"descending", "desc; DROP TABLE audit_log", "DESC", "down"}
	for _, raw := range cases {
		if _, err := models.ParseAuditSort("created_at", raw); err == nil {
			t.Fatalf("sort direction %q must be rejected, not passed through", raw)
		} else if !errors.Is(err, models.ErrValidation) {
			t.Fatalf("sort direction %q must fail validation, got %v", raw, err)
		}
	}
}
