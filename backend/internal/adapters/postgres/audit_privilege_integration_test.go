//go:build integration

package postgres_test

import (
	"context"
	"testing"

	"github.com/GoatWhistle/timeline/internal/testsupport"
)

const appRole = "timeline_app"

func TestAuditLogUpdateIsRevokedFromTheApplicationRole(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()

	var exists bool
	if err := pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1)`, appRole).Scan(&exists); err != nil {
		t.Fatalf("looking up the application role: %v", err)
	}
	if !exists {
		t.Fatalf("the least privilege role %q does not exist: the journal is guarded by the "+
			"trigger alone, and the owner connection may rewrite it at will", appRole)
	}

	var granted bool
	if err := pool.QueryRow(ctx,
		`SELECT has_table_privilege($1, 'audit_log', 'UPDATE')`, appRole).Scan(&granted); err != nil {
		t.Fatalf("reading the UPDATE privilege: %v", err)
	}
	if granted {
		t.Fatalf("the application role %q holds UPDATE on audit_log: an existing entry must not "+
			"be rewritable, and no part of the product ever updates one", appRole)
	}
}

func TestApplicationRoleKeepsTheWritesTheProductNeeds(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()

	checks := []struct {
		table     string
		privilege string
	}{
		{"audit_log", "INSERT"},
		{"audit_log", "DELETE"},
		{"events", "UPDATE"},
		{"users", "UPDATE"},
	}
	for _, check := range checks {
		var granted bool
		if err := pool.QueryRow(ctx, `SELECT has_table_privilege($1, $2, $3)`,
			appRole, check.table, check.privilege).Scan(&granted); err != nil {
			t.Fatalf("reading %s on %s: %v", check.privilege, check.table, err)
		}
		if !granted {
			t.Fatalf("the application role %q lost %s on %s, which the product needs: "+
				"the retention job deletes aged entries under the trigger's flag",
				appRole, check.privilege, check.table)
		}
	}
}
