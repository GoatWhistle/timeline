//go:build integration

package eventtest_test

import (
	"encoding/csv"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func readCSV(t *testing.T, body []byte) [][]string {
	t.Helper()
	rows, err := csv.NewReader(strings.NewReader(string(body))).ReadAll()
	if err != nil {
		t.Fatalf("the export is not valid CSV: %v\n%s", err, body)
	}
	return rows
}

func exportTitles(rows [][]string) map[string][]string {
	out := map[string][]string{}
	for _, row := range rows[1:] {
		out[row[1]] = row
	}
	return out
}

func TestAdminExportCarriesDraftsAndArchiveWhenTheListDoes(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(48 * time.Hour).Truncate(time.Second)

	f.AdminClient.CreateEvent(t, "Export draft", start)
	archived := f.AdminClient.CreateEvent(t, "Export archived", start)
	f.AdminClient.Publish(t, archived)
	support.RequireStatus(t, f.AdminClient.Post("/admin/events/"+archived+"/archive", nil),
		http.StatusOK, "archiving the event")

	resp := f.AdminClient.Get("/admin/events/export?include_archived=true")
	support.RequireStatus(t, resp, http.StatusOK, "the admin export")
	if got := resp.Header.Get("Content-Type"); !strings.HasPrefix(got, "text/csv") {
		t.Fatalf("the export is not served as CSV: %q", got)
	}
	if got := resp.Header.Get("Content-Disposition"); !strings.Contains(got, "events.csv") {
		t.Fatalf("the export does not download as events.csv: %q", got)
	}

	rows := readCSV(t, resp.Body)
	header := strings.Join(rows[0], ",")
	for _, column := range []string{"id", "state", "published_at", "archived_at", "duration_days"} {
		if !strings.Contains(header, column) {
			t.Fatalf("the export lost the %s column: %s", column, header)
		}
	}
	byTitle := exportTitles(rows)
	draft, ok := byTitle["Export draft"]
	if !ok {
		t.Fatalf("the admin export dropped the draft the admin list shows: %v", byTitle)
	}
	if draft[3] != "UNPUBLISHED" {
		t.Fatalf("the draft is exported as %s", draft[3])
	}
	if _, ok := byTitle["Export archived"]; !ok {
		t.Fatalf("the export dropped the archived event asked for: %v", byTitle)
	}

	without := exportTitles(readCSV(t, f.AdminClient.Get("/admin/events/export").Body))
	if _, ok := without["Export archived"]; ok {
		t.Fatal("the export kept an archived event the list leaves out by default")
	}
}

func TestAdminExportFollowsTheListFilter(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	start := time.Now().UTC().Add(48 * time.Hour).Truncate(time.Second)
	f.AdminClient.CreateEvent(t, "Export filtered draft", start)

	rows := readCSV(t, f.AdminClient.Get("/admin/events/export?state=UNPUBLISHED").Body)
	for _, row := range rows[1:] {
		if row[3] != "UNPUBLISHED" {
			t.Fatalf("the state filter let %s (%s) into the export", row[1], row[3])
		}
	}
	if _, ok := exportTitles(rows)["Export filtered draft"]; !ok {
		t.Fatal("the filtered export lost the matching draft")
	}
}

func TestAdminExportIsForAdministratorsOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	support.RequireStatus(t, s.Session(t, f.Member).Get("/admin/events/export"),
		http.StatusForbidden, "a member exporting the admin list")
	support.RequireStatus(t, s.Anonymous(t, "/admin/events/export"), http.StatusUnauthorized,
		"an anonymous admin export")
}
