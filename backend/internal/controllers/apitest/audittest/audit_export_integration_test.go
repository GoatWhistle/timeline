//go:build integration

package audittest_test

import (
	"context"
	"encoding/csv"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

const auditExportHeader = "created_at,actor_user_id,actor_email,action,entity_type,entity_id,changes"

func readCSV(t *testing.T, resp support.Response) [][]string {
	t.Helper()
	support.RequireStatus(t, resp, http.StatusOK, "the audit export")
	rows, err := csv.NewReader(strings.NewReader(string(resp.Body))).ReadAll()
	if err != nil {
		t.Fatalf("the export is not valid CSV: %v\n%s", err, resp.Body)
	}
	if len(rows) == 0 {
		t.Fatal("the export carries no header")
	}
	return rows
}

func TestAuditExportWritesTheHeaderAndTheChanges(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	token := strings.ToUpper(strings.ReplaceAll(uuid.NewString(), "-", "")[:10])
	entity := uuid.New()
	if _, err := s.DB().Pool().Exec(context.Background(), `
		INSERT INTO audit_log (action, entity_type, entity_id, before_json, after_json, created_at)
		VALUES ($1, 'REGISTRATION_STATUS', $2, '{"status":"TODO"}', '{"status":"DONE"}', $3)`,
		"EXPORT_"+token, entity, probeEpoch); err != nil {
		t.Fatalf("inserting the audit probe: %v", err)
	}

	resp := f.AdminClient.Get("/admin/audit/export?search=" + token)
	rows := readCSV(t, resp)
	for header, want := range map[string]string{
		"Content-Type":           "text/csv; charset=utf-8",
		"Content-Disposition":    `attachment; filename="audit.csv"`,
		"X-Content-Type-Options": "nosniff",
		"Cache-Control":          "no-store",
	} {
		if got := resp.Header.Get(header); got != want {
			t.Fatalf("the export %s is %q, want %q", header, got, want)
		}
	}
	if got := strings.Join(rows[0], ","); got != auditExportHeader {
		t.Fatalf("the export header is %s, want %s", got, auditExportHeader)
	}
	if len(rows) != 2 {
		t.Fatalf("the search let %d rows into the export, want only the probe: %v", len(rows)-1, rows)
	}
	want := []string{probeEpoch.Format(time.RFC3339), "", "", "EXPORT_" + token,
		"REGISTRATION_STATUS", entity.String(), `{"before":{"status":"TODO"},"after":{"status":"DONE"}}`}
	if got := strings.Join(rows[1], "|"); got != strings.Join(want, "|") {
		t.Fatalf("the exported probe is %s, want %s", got, strings.Join(want, "|"))
	}
}

func TestAuditExportFollowsTheListFilterAndSort(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	seedSortProbes(t, s, f)

	rows := readCSV(t, f.AdminClient.Get("/admin/audit/export?sort=actor&order=desc"+probeWindow))
	got := make([]string, 0, len(rows)-1)
	for _, row := range rows[1:] {
		got = append(got, row[3])
	}
	if strings.Join(got, ",") != "PROBE_C,PROBE_A,PROBE_D,PROBE_B" {
		t.Fatalf("the export ignored the filter or the sort: %v", got)
	}
	if rows[1][1] != f.Member.ID || rows[1][2] != f.Member.Email || rows[3][1] != "" {
		t.Fatalf("the export names the actor wrongly: %v", rows[1:])
	}

	byActor := readCSV(t, f.AdminClient.Get("/admin/audit/export?actor_user_id="+f.Admin.ID))
	listed := readAudit(t, f.AdminClient, "?page_size=200&actor_user_id="+f.Admin.ID)
	if int64(len(byActor)-1) != listed.Meta.Total || listed.Meta.Total == 0 {
		t.Fatalf("the export holds %d rows of the administrator, the list %d",
			len(byActor)-1, listed.Meta.Total)
	}
	for _, row := range byActor[1:] {
		if row[1] != f.Admin.ID {
			t.Fatalf("the actor filter let %s into the export", row[1])
		}
	}
}

func TestAuditExportCarriesEveryRowBeyondOnePage(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	if _, err := s.DB().Pool().Exec(context.Background(), `
		INSERT INTO audit_log (action, entity_type, created_at)
		SELECT 'BULK_PROBE', 'EVENT', $1::timestamptz + make_interval(secs => g)
		FROM generate_series(1, 1203) g`, probeEpoch); err != nil {
		t.Fatalf("inserting the bulk audit probes: %v", err)
	}

	rows := readCSV(t, f.AdminClient.Get("/admin/audit/export?action=BULK_PROBE"))
	if len(rows)-1 != 1203 {
		t.Fatalf("the export holds %d of 1203 matching rows", len(rows)-1)
	}
	seen := make(map[string]bool, len(rows))
	for _, row := range rows[1:] {
		if seen[row[0]] {
			t.Fatalf("the export repeated the row of %s", row[0])
		}
		seen[row[0]] = true
	}
}

func TestAuditExportIsForAdministratorsOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Get("/admin/audit/export"),
		http.StatusForbidden, "a member exporting the audit log")
	support.RequireStatus(t, member.Get("/admin/audit/export?sort=email"),
		http.StatusForbidden, "a member is refused before the query is validated")
	support.RequireStatus(t, s.Anonymous(t, "/admin/audit/export"), http.StatusUnauthorized,
		"an anonymous audit export")
	support.RequireErrorCode(t, f.AdminClient.Get("/admin/audit/export?sort=email"),
		http.StatusBadRequest, "validation_failed", "an audit export with an unknown sort")
}
