package event

import (
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func countPlaceholders(sql string) int {
	seen := map[string]bool{}
	for i := 1; i <= 9; i++ {
		token := "$" + itoa(i)
		if strings.Contains(sql, token) {
			seen[token] = true
		}
	}
	return len(seen)
}

func TestFilterSQLBindsEveryArgument(t *testing.T) {
	now := time.Now().UTC()
	cases := []struct {
		name   string
		filter models.EventFilter
	}{
		{"unpublished", models.EventFilter{States: []models.EventState{models.EventUnpublished}}},
		{"archived", models.EventFilter{States: []models.EventState{models.EventArchived}}},
		{"upcoming", models.EventFilter{States: []models.EventState{models.EventUpcoming}}},
		{"active", models.EventFilter{States: []models.EventState{models.EventActive}}},
		{"finished", models.EventFilter{States: []models.EventState{models.EventFinished}}},
		{"unpublished with search", models.EventFilter{
			Search: "cup",
			States: []models.EventState{models.EventUnpublished},
		}},
		{"archived and active", models.EventFilter{
			States: []models.EventState{models.EventArchived, models.EventActive},
		}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			sql, args := eventFilterSQL(tc.filter, now)
			if got := countPlaceholders(sql); got != len(args) {
				t.Fatalf("%s: %d placeholders against %d arguments; postgres rejects the query\nSQL: %s",
					tc.name, got, len(args), sql)
			}
		})
	}
}
