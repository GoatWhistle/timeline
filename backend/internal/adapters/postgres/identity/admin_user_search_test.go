package identity

import (
	"strconv"
	"strings"
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func countPlaceholders(sql string) int {
	seen := map[string]bool{}
	for i := 1; i <= 9; i++ {
		token := "$" + strconv.Itoa(i)
		if strings.Contains(sql, token) {
			seen[token] = true
		}
	}
	return len(seen)
}

func boolPtr(v bool) *bool { return &v }

func TestAdminUserFilterBindsEveryArgument(t *testing.T) {
	cases := []struct {
		name   string
		filter models.UserFilter
	}{
		{"empty", models.UserFilter{}},
		{"query", models.UserFilter{Query: "ivan"}},
		{"active", models.UserFilter{Active: boolPtr(true)}},
		{"admin", models.UserFilter{Admin: boolPtr(false)}},
		{"telegram", models.UserFilter{Telegram: boolPtr(true)}},
		{"everything", models.UserFilter{
			Query:    "ivan",
			Active:   boolPtr(true),
			Admin:    boolPtr(true),
			Telegram: boolPtr(false),
		}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			sql, args := adminUserFilterSQL(tc.filter)
			if got := countPlaceholders(sql); got != len(args) {
				t.Fatalf("%s: %d placeholders against %d arguments; postgres rejects the query\nSQL: %s",
					tc.name, got, len(args), sql)
			}
		})
	}
}

func TestAdminUserFilterHidesDeletedAccounts(t *testing.T) {
	sql, _ := adminUserFilterSQL(models.UserFilter{})
	if !strings.Contains(sql, "deleted_at IS NULL") {
		t.Fatalf("a deleted account would show in the directory\nSQL: %s", sql)
	}
}

func TestAdminUserFilterSearchesTheTelegramHandle(t *testing.T) {
	sql, _ := adminUserFilterSQL(models.UserFilter{Query: "ivan"})
	if !strings.Contains(sql, "telegram_username") {
		t.Fatalf("searching by Telegram handle finds nothing\nSQL: %s", sql)
	}
	if !strings.Contains(sql, "lower(email) LIKE") {
		t.Fatalf("searching by address is case sensitive\nSQL: %s", sql)
	}
}

func TestAdminUserFilterSeparatesUnsetFromFalse(t *testing.T) {
	unset, _ := adminUserFilterSQL(models.UserFilter{})
	if strings.Contains(unset, "is_admin") {
		t.Fatalf("an unset admin filter still narrowed the list\nSQL: %s", unset)
	}

	explicit, args := adminUserFilterSQL(models.UserFilter{Admin: boolPtr(false)})
	if !strings.Contains(explicit, "is_admin") {
		t.Fatalf("admin=false did not narrow the list\nSQL: %s", explicit)
	}
	if len(args) != 1 || args[0] != false {
		t.Fatalf("admin=false sent %v, so it would read as admin=true", args)
	}
}

func TestAdminUserFilterMatchesPresenceOfTelegramWithoutAnArgument(t *testing.T) {
	with, args := adminUserFilterSQL(models.UserFilter{Telegram: boolPtr(true)})
	if !strings.Contains(with, "telegram_username IS NOT NULL") || len(args) != 0 {
		t.Fatalf("telegram=true must test presence, not equality\nSQL: %s args: %v", with, args)
	}

	without, args := adminUserFilterSQL(models.UserFilter{Telegram: boolPtr(false)})
	if !strings.Contains(without, "telegram_username IS NULL") || len(args) != 0 {
		t.Fatalf("telegram=false must test absence\nSQL: %s args: %v", without, args)
	}
}

func TestAdminUserOrderSQLSortsByEveryField(t *testing.T) {
	cases := []struct {
		name   string
		filter models.UserFilter
		expect string
	}{
		{"default", models.UserFilter{}, "lower(last_name) ASC"},
		{"name descending", models.UserFilter{
			Sort: models.UserSortName, Direction: models.CatalogSortDesc,
		}, "lower(last_name) DESC, lower(first_name) DESC"},
		{"email", models.UserFilter{
			Sort: models.UserSortEmail, Direction: models.CatalogSortAsc,
		}, "lower(email) ASC"},
		{"created descending", models.UserFilter{
			Sort: models.UserSortCreated, Direction: models.CatalogSortDesc,
		}, "created_at DESC"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := adminUserOrderSQL(tc.filter); !strings.HasPrefix(got, tc.expect) {
				t.Fatalf("%s: order is %q, wanted it to start with %q; the list comes back wrongly ordered",
					tc.name, got, tc.expect)
			}
		})
	}
}

func TestAdminUserOrderSQLNeverInterpolatesInput(t *testing.T) {
	order := adminUserOrderSQL(models.UserFilter{
		Sort:      models.UserSortField("email; DROP TABLE users"),
		Direction: models.CatalogSortDirection("asc; DROP TABLE users"),
	})
	if strings.Contains(order, "DROP") {
		t.Fatalf("an unknown sort field reached the SQL: %q", order)
	}
}

func TestAdminUserColumnsNeverSelectTheChatIdentifier(t *testing.T) {
	if strings.Contains(adminUserColumns, "telegram_chat_id") {
		t.Fatalf("the directory selects telegram_chat_id, which must never leave the server")
	}
	if strings.Contains(adminUserColumns, "password_hash") {
		t.Fatalf("the directory selects password_hash, which must never leave the server")
	}
}
