//go:build integration

package usertest_test

import (
	"context"
	"encoding/csv"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/controllers/apitest/support"
)

const userExportHeader = "id,display_name,first_name,last_name,email,nickname,telegram_username," +
	"is_admin,is_active,email_verified_at,locale,timezone,created_at"

func readCSV(t *testing.T, resp support.Response) [][]string {
	t.Helper()
	support.RequireStatus(t, resp, http.StatusOK, "the user export")
	rows, err := csv.NewReader(strings.NewReader(string(resp.Body))).ReadAll()
	if err != nil {
		t.Fatalf("the export is not valid CSV: %v\n%s", err, resp.Body)
	}
	if len(rows) == 0 {
		t.Fatal("the export carries no header")
	}
	return rows
}

func column(rows [][]string, index int) []string {
	out := make([]string, 0, len(rows))
	for _, row := range rows[1:] {
		out = append(out, row[index])
	}
	return out
}

func TestUserExportWritesTheHeaderAndNoSecrets(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	if _, err := s.DB().Pool().Exec(context.Background(), `
		UPDATE users SET telegram_chat_id = '987650001', telegram_username = '@export_probe'
		WHERE display_id = $1`, f.Member.ID); err != nil {
		t.Fatalf("linking the member to Telegram: %v", err)
	}

	resp := f.AdminClient.Get("/admin/users/export")
	rows := readCSV(t, resp)
	for header, want := range map[string]string{
		"Content-Type":           "text/csv; charset=utf-8",
		"Content-Disposition":    `attachment; filename="users.csv"`,
		"X-Content-Type-Options": "nosniff",
		"Cache-Control":          "no-store",
	} {
		if got := resp.Header.Get(header); got != want {
			t.Fatalf("the export %s is %q, want %q", header, got, want)
		}
	}
	header := strings.Join(rows[0], ",")
	if header != userExportHeader {
		t.Fatalf("the export header is %s, want %s", header, userExportHeader)
	}
	for _, secret := range []string{"password", "token", "chat"} {
		if strings.Contains(header, secret) {
			t.Fatalf("the export header exposes %s: %s", secret, header)
		}
	}
	for _, leak := range []string{"987650001", "$argon2"} {
		if strings.Contains(string(resp.Body), leak) {
			t.Fatalf("the export leaks %s", leak)
		}
	}
	if len(rows)-1 != 3 {
		t.Fatalf("the export holds %d accounts, want the 3 seeded ones", len(rows)-1)
	}
	for _, row := range rows[1:] {
		if row[0] == f.Member.ID && (row[4] != f.Member.Email || row[6] != "@export_probe" || row[7] != "false") {
			t.Fatalf("the member row is exported wrongly: %v", row)
		}
		if row[0] == f.Admin.ID && row[7] != "true" {
			t.Fatalf("the administrator is not exported as one: %v", row)
		}
	}
}

func TestUserExportFollowsTheSearchFiltersAndSort(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	admins := readCSV(t, f.AdminClient.Get("/admin/users/export?admin=true"))
	if got := strings.Join(column(admins, 0), ","); got != f.Admin.ID {
		t.Fatalf("the admin filter exported %s, want only %s", got, f.Admin.ID)
	}

	byQuery := readCSV(t, f.AdminClient.Get("/admin/users/export?query="+url.QueryEscape(f.Member.Email)))
	if got := strings.Join(column(byQuery, 0), ","); got != f.Member.ID {
		t.Fatalf("the query exported %s, want only %s", got, f.Member.ID)
	}

	sorted := readCSV(t, f.AdminClient.Get("/admin/users/export?sort=email&order=desc"))
	want := strings.Join([]string{f.Outsider.Email, f.Member.Email, f.Admin.Email}, ",")
	if got := strings.Join(column(sorted, 4), ","); got != want {
		t.Fatalf("the export ignored the sort: %s, want %s", got, want)
	}

	support.RequireErrorCode(t, f.AdminClient.Get("/admin/users/export?sort=password_hash"),
		http.StatusBadRequest, "validation_failed", "a user export with an unknown sort")
}

func TestUserExportCarriesEveryAccountBeyondOnePage(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)
	if _, err := s.DB().Pool().Exec(context.Background(), `
		INSERT INTO users (first_name, last_name, email, nickname, password_hash)
		SELECT 'Bulk', 'User ' || g, 'bulk-' || g || '@example.com', 'bulk' || g, 'unused'
		FROM generate_series(1, 1203) g`); err != nil {
		t.Fatalf("inserting the bulk accounts: %v", err)
	}

	rows := readCSV(t, f.AdminClient.Get("/admin/users/export?query=bulk-"))
	if len(rows)-1 != 1203 {
		t.Fatalf("the export holds %d of 1203 matching accounts", len(rows)-1)
	}
	seen := make(map[string]bool, len(rows))
	for _, id := range column(rows, 0) {
		if seen[id] {
			t.Fatalf("the export repeated the account %s", id)
		}
		seen[id] = true
	}
}

func TestUserExportIsForAdministratorsOnly(t *testing.T) {
	s := support.NewStack(t)
	f := s.Seed(t)

	member := s.Session(t, f.Member)
	support.RequireStatus(t, member.Get("/admin/users/export"),
		http.StatusForbidden, "a member exporting the user directory")
	support.RequireStatus(t, member.Get("/admin/users/export?sort=password_hash"),
		http.StatusForbidden, "a member is refused before the query is validated")
	support.RequireStatus(t, s.Anonymous(t, "/admin/users/export"), http.StatusUnauthorized,
		"an anonymous user export")
}
