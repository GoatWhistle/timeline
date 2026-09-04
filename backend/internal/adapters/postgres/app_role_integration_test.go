//go:build integration

package postgres_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func connectAs(t *testing.T, role string) *postgres.DB {
	t.Helper()
	ctx := context.Background()
	db, err := postgres.Connect(ctx, config.DB{
		DSN:             testsupport.DSN(t),
		MaxConns:        2,
		MinConns:        1,
		MaxConnLifetime: time.Minute,
		AppRole:         role,
	})
	if err != nil {
		t.Fatalf("connecting with the application role %q: %v", role, err)
	}
	t.Cleanup(db.Close)
	return db
}

func TestConfiguredAppRoleCannotRewriteOrEraseTheAuditLog(t *testing.T) {
	testsupport.Pool(t)
	db := connectAs(t, appRole)
	ctx := context.Background()

	var effective string
	if err := db.Q(ctx).QueryRow(ctx, `SELECT current_user`).Scan(&effective); err != nil {
		t.Fatalf("reading the effective role: %v", err)
	}
	if effective != appRole {
		t.Fatalf("the pool did not switch to %q, it still runs as %q: "+
			"DATABASE_APP_ROLE is parsed but never applied", appRole, effective)
	}

	if _, err := db.Q(ctx).Exec(ctx,
		`INSERT INTO audit_log (action, entity_type) VALUES ('PROBE', 'PROBE')`); err != nil {
		t.Fatalf("the application role must still append to the journal: %v", err)
	}

	_, err := db.Q(ctx).Exec(ctx, `UPDATE audit_log SET action = 'TAMPERED'`)
	if err == nil {
		t.Fatal("the application role rewrote the audit log through the real pool")
	}
	if !strings.Contains(err.Error(), "permission denied") {
		t.Fatalf("the refusal must come from privileges, not from the trigger: %v", err)
	}

	_, err = db.Q(ctx).Exec(ctx, `DELETE FROM audit_log`)
	if err == nil {
		t.Fatal("the application role deleted audit rows outside the retention flag")
	}
	if strings.Contains(err.Error(), "permission denied") {
		t.Fatalf("the retention job needs DELETE, so the trigger must refuse this, "+
			"not the privilege system: %v", err)
	}

	var remaining int
	if err := db.Q(ctx).QueryRow(ctx, `SELECT count(*) FROM audit_log`).Scan(&remaining); err != nil {
		t.Fatalf("counting the journal: %v", err)
	}
	if remaining == 0 {
		t.Fatal("the refused statements still emptied the journal")
	}
}
