package audit

import (
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestAuditOrderSQLUsesWhitelistedColumns(t *testing.T) {
	asc, desc := models.CatalogSortAsc, models.CatalogSortDesc
	cases := map[models.AuditSort]string{
		{Field: models.AuditSortCreatedAt, Direction: asc}:   "a.created_at ASC, a.id ASC",
		{Field: models.AuditSortCreatedAt, Direction: desc}:  "a.created_at DESC, a.id DESC",
		{Field: models.AuditSortActor, Direction: asc}:       "lower(u.email) ASC NULLS LAST, a.created_at DESC, a.id DESC",
		{Field: models.AuditSortActor, Direction: desc}:      "lower(u.email) DESC NULLS LAST, a.created_at DESC, a.id DESC",
		{Field: models.AuditSortAction, Direction: asc}:      "a.action ASC, a.created_at DESC, a.id DESC",
		{Field: models.AuditSortAction, Direction: desc}:     "a.action DESC, a.created_at DESC, a.id DESC",
		{Field: models.AuditSortEntityType, Direction: asc}:  "a.entity_type ASC, a.created_at DESC, a.id DESC",
		{Field: models.AuditSortEntityType, Direction: desc}: "a.entity_type DESC, a.created_at DESC, a.id DESC",
	}
	for sort, want := range cases {
		if got := auditOrderSQL(sort); got != want {
			t.Fatalf("sort %+v: got %q, want %q", sort, got, want)
		}
	}
}

func TestAuditOrderSQLDefaultsToNewestFirst(t *testing.T) {
	if got := auditOrderSQL(models.DefaultAuditSort); got != "a.created_at DESC, a.id DESC" {
		t.Fatalf("the default audit order must be newest first, got %q", got)
	}
}

func TestAuditOrderSQLIgnoresUnknownField(t *testing.T) {
	got := auditOrderSQL(models.AuditSort{
		Field:     models.AuditSortField("created_at; DROP TABLE audit_log"),
		Direction: models.CatalogSortAsc,
	})
	if strings.Contains(got, "DROP") {
		t.Fatalf("an unknown sort field reached the SQL: %q", got)
	}
	if got != "a.created_at ASC, a.id ASC" {
		t.Fatalf("an unknown sort field must fall back to created_at, got %q", got)
	}
}

func TestAuditOrderSQLIgnoresUnknownDirection(t *testing.T) {
	got := auditOrderSQL(models.AuditSort{
		Field:     models.AuditSortAction,
		Direction: models.CatalogSortDirection("ASC; DROP TABLE audit_log"),
	})
	if strings.Contains(got, "DROP") {
		t.Fatalf("an unknown sort direction reached the SQL: %q", got)
	}
	if got != "a.action DESC, a.created_at DESC, a.id DESC" {
		t.Fatalf("an unknown sort direction must fall back to DESC, got %q", got)
	}
}

func TestAuditFilterSQLSearchesEmailActionAndEntityTypeAsParameter(t *testing.T) {
	where, args := auditFilterSQL(models.AuditFilter{Action: "STATUS_CHANGE", Search: "  50%_Off\\ "})
	if len(args) != 2 {
		t.Fatalf("got %d arguments, want the action and the search pattern: %v", len(args), args)
	}
	if args[1] != `%50\%\_off\\%` {
		t.Fatalf("the search pattern is not escaped and lowered: %q", args[1])
	}
	for _, column := range []string{"lower(coalesce(u.email, '')) LIKE $2",
		"lower(a.action) LIKE $2", "lower(a.entity_type) LIKE $2"} {
		if !strings.Contains(where, column) {
			t.Fatalf("the search does not cover %s: %s", column, where)
		}
	}
	if strings.Contains(where, "50") || strings.Contains(where, "off") {
		t.Fatalf("the search value was interpolated into the SQL: %s", where)
	}
}

func TestAuditFilterSQLOmitsBlankSearch(t *testing.T) {
	where, args := auditFilterSQL(models.AuditFilter{Search: "   "})
	if where != "" || len(args) != 0 {
		t.Fatalf("a blank search must not filter: %q %v", where, args)
	}
}
