//go:build integration

package catalogtest_test

import (
	"encoding/csv"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

func freshReader(t *testing.T, s *support.Stack) *support.Client {
	t.Helper()
	suffix := strings.ReplaceAll(uuid.NewString(), "-", "")
	return s.Session(t, s.Register(t, "reader-"+suffix+"@example.com"))
}

func seedSortableCatalog(t *testing.T, admin *support.Client) {
	t.Helper()
	base := time.Now().UTC().Add(72 * time.Hour).Truncate(time.Second)

	titles := map[string]time.Time{
		"Zulu sort probe":  base.Add(24 * time.Hour),
		"Alpha sort probe": base.Add(48 * time.Hour),
		"Mike sort probe":  base,
	}
	for title, start := range titles {
		admin.Publish(t, admin.CreateEvent(t, title, start))
	}
}

func probeTitles(items []support.CatalogItem) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		if strings.HasSuffix(item.Title, "sort probe") {
			out = append(out, item.Title)
		}
	}
	return out
}

func TestCatalogSortsByStartDateAndTitle(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	seedSortableCatalog(t, f.AdminClient)

	cases := map[string][]string{
		"sort=start_at&order=asc":  {"Mike sort probe", "Zulu sort probe", "Alpha sort probe"},
		"sort=start_at&order=desc": {"Alpha sort probe", "Zulu sort probe", "Mike sort probe"},
		"sort=title&order=asc":     {"Alpha sort probe", "Mike sort probe", "Zulu sort probe"},
		"sort=title&order=desc":    {"Zulu sort probe", "Mike sort probe", "Alpha sort probe"},
		"sort=end_at&order=asc":    {"Mike sort probe", "Zulu sort probe", "Alpha sort probe"},
		"sort=end_at&order=desc":   {"Alpha sort probe", "Zulu sort probe", "Mike sort probe"},
	}
	for query, want := range cases {
		got := probeTitles(support.Catalog(t, freshReader(t, s), query+"&page_size=100"))
		if strings.Join(got, "|") != strings.Join(want, "|") {
			t.Fatalf("%s: got %v, want %v", query, got, want)
		}
	}
}

func TestCatalogDefaultSortIsStartDateAscending(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	seedSortableCatalog(t, f.AdminClient)

	want := []string{"Mike sort probe", "Zulu sort probe", "Alpha sort probe"}
	got := probeTitles(support.Catalog(t, freshReader(t, s), "page_size=100"))
	if strings.Join(got, "|") != strings.Join(want, "|") {
		t.Fatalf("default sort: got %v, want %v", got, want)
	}
}

func TestCatalogRejectsUnknownSort(t *testing.T) {
	s := support.NewStack(t)
	s.Seed(t)

	cases := []url.Values{
		{"sort": {"prize_pool"}},
		{"sort": {"e.start_at"}},
		{"sort": {"start_at; DROP TABLE events"}},
		{"order": {"ascending"}},
		{"order": {"asc; DROP TABLE events"}},
	}
	for _, query := range cases {
		resp := freshReader(t, s).Get("/catalog?" + query.Encode())
		support.RequireStatus(t, resp, http.StatusBadRequest, "rejecting "+query.Encode())
		if code := resp.ErrorCode(t); code != "validation_failed" {
			t.Fatalf("%s: expected validation_failed, got %q", query.Encode(), code)
		}
	}

	if items := support.Catalog(t, freshReader(t, s), ""); len(items) == 0 {
		t.Fatal("the events table must still be readable after the rejected sorts")
	}
}

func exportCatalog(t *testing.T, c *support.Client, query string) ([][]string, http.Header) {
	t.Helper()
	path := "/catalog/export"
	if query != "" {
		path += "?" + query
	}
	resp := c.Get(path)
	support.RequireStatus(t, resp, http.StatusOK, "exporting the catalog "+query)
	records, err := csv.NewReader(strings.NewReader(string(resp.Body))).ReadAll()
	if err != nil {
		t.Fatalf("parsing the exported CSV: %v", err)
	}
	return records, resp.Header
}

func TestCatalogExportMatchesListingAndFilters(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	seedSortableCatalog(t, f.AdminClient)

	records, _ := exportCatalog(t, freshReader(t, s), "sort=title&order=asc")
	if len(records) < 2 {
		t.Fatalf("the export must carry a header and rows, got %d records", len(records))
	}
	if records[0][0] != "id" || records[0][1] != "title" {
		t.Fatalf("unexpected export header: %v", records[0])
	}

	titles := make([]string, 0, len(records))
	for _, row := range records[1:] {
		if strings.HasSuffix(row[1], "sort probe") {
			titles = append(titles, row[1])
		}
	}
	want := []string{"Alpha sort probe", "Mike sort probe", "Zulu sort probe"}
	if strings.Join(titles, "|") != strings.Join(want, "|") {
		t.Fatalf("the export must honour the sort: got %v, want %v", titles, want)
	}

	filtered, _ := exportCatalog(t, freshReader(t, s), url.Values{"search": {"Alpha sort probe"}}.Encode())
	if len(filtered) != 2 {
		t.Fatalf("the export must honour the search filter, got %d records", len(filtered))
	}
	if filtered[1][1] != "Alpha sort probe" {
		t.Fatalf("unexpected filtered export row: %v", filtered[1])
	}
}

func TestCatalogExportSendsCSVHeaders(t *testing.T) {
	s := support.NewStack(t)
	s.Seed(t)

	_, header := exportCatalog(t, freshReader(t, s), "")
	if ct := header.Get("Content-Type"); !strings.HasPrefix(ct, "text/csv") {
		t.Fatalf("expected a CSV content type, got %q", ct)
	}
	if cd := header.Get("Content-Disposition"); !strings.Contains(cd, `filename="catalog.csv"`) {
		t.Fatalf("expected an attachment filename, got %q", cd)
	}
}

func TestCatalogExportRequiresSessionAndHidesNotes(t *testing.T) {
	s := support.NewStack(t)
	s.Seed(t)

	support.RequireStatus(t, s.Client(t).Get("/catalog/export"), http.StatusUnauthorized,
		"exporting the catalog anonymously")

	records, _ := exportCatalog(t, freshReader(t, s), "")
	if strings.Contains(strings.Join(records[0], ","), "notes") {
		t.Fatalf("the export must not carry administrative notes: %v", records[0])
	}
	for _, row := range records[1:] {
		if strings.Contains(strings.Join(row, ","), "internal administrative note") {
			t.Fatalf("the export leaked an administrative note: %v", row)
		}
	}
}

func TestCatalogExportRejectsUnknownSort(t *testing.T) {
	s := support.NewStack(t)
	s.Seed(t)

	support.RequireStatus(t, freshReader(t, s).Get("/catalog/export?sort=prize_pool"),
		http.StatusBadRequest, "rejecting an unknown export sort")
}
