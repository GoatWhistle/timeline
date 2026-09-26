package event

import (
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func countPlaceholders(sql string) int {
	highest := 0
	for i := 1; i <= 12; i++ {
		if strings.Contains(sql, "$"+itoa(i)) {
			highest = i
		}
	}
	return highest
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
		{"from", models.EventFilter{From: &now}},
		{"to", models.EventFilter{To: &now}},
		{"from and to", models.EventFilter{From: &now, To: &now}},
		{"period with search and state", models.EventFilter{
			Search: "cup",
			From:   &now,
			To:     &now,
			States: []models.EventState{models.EventActive},
		}},
		{"period with taxonomy", models.EventFilter{
			From:    &now,
			To:      &now,
			Kinds:   []models.EventKind{models.EventKindHackathon},
			Origins: []models.EventOrigin{models.OriginRU},
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

func TestFilterSQLNarrowsByPeriod(t *testing.T) {
	now := time.Now().UTC()

	sql, _ := eventFilterSQL(models.EventFilter{From: &now}, now)
	if !strings.Contains(sql, "end_at >=") {
		t.Fatalf("from must keep events ending on or after it, so an event still running is found\nSQL: %s", sql)
	}

	sql, _ = eventFilterSQL(models.EventFilter{To: &now}, now)
	if !strings.Contains(sql, "start_at <=") {
		t.Fatalf("to must keep events starting on or before it\nSQL: %s", sql)
	}
}

func TestOrderSQLSortsByEveryField(t *testing.T) {
	cases := []struct {
		name   string
		sort   models.CatalogSort
		expect string
	}{
		{"default", models.CatalogSort{}, "start_at DESC, title"},
		{"start ascending", models.CatalogSort{
			Field: models.CatalogSortStartAt, Direction: models.CatalogSortAsc,
		}, "start_at ASC"},
		{"start descending", models.CatalogSort{
			Field: models.CatalogSortStartAt, Direction: models.CatalogSortDesc,
		}, "start_at DESC"},
		{"end ascending", models.CatalogSort{
			Field: models.CatalogSortEndAt, Direction: models.CatalogSortAsc,
		}, "end_at ASC"},
		{"title ascending", models.CatalogSort{
			Field: models.CatalogSortTitle, Direction: models.CatalogSortAsc,
		}, "lower(title) ASC"},
		{"title descending", models.CatalogSort{
			Field: models.CatalogSortTitle, Direction: models.CatalogSortDesc,
		}, "lower(title) DESC"},
		{"longest first", models.CatalogSort{
			Field: models.CatalogSortDuration, Direction: models.CatalogSortDesc,
		}, "(end_at - start_at) DESC"},
		{"richest first, events without a prize last", models.CatalogSort{
			Field: models.CatalogSortPrize, Direction: models.CatalogSortDesc,
		}, "prize_pool DESC NULLS LAST"},
		{"smallest minimum team first", models.CatalogSort{
			Field: models.CatalogSortTeamMin, Direction: models.CatalogSortAsc,
		}, "team_size_min ASC NULLS LAST"},
		{"largest maximum team first", models.CatalogSort{
			Field: models.CatalogSortTeamMax, Direction: models.CatalogSortDesc,
		}, "team_size_max DESC NULLS LAST"},
		{"most tracks first", models.CatalogSort{
			Field: models.CatalogSortTracks, Direction: models.CatalogSortDesc,
		}, "(SELECT count(*) FROM event_tracks et WHERE et.event_id = events.id) DESC"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := eventOrderSQL(tc.sort); !strings.HasPrefix(got, tc.expect) {
				t.Fatalf("%s: order is %q, wanted it to start with %q; the list would come back in the wrong order",
					tc.name, got, tc.expect)
			}
		})
	}
}

func TestOrderSQLNeverInterpolatesInput(t *testing.T) {
	sort := models.CatalogSort{
		Field:     models.CatalogSortField("title; DROP TABLE events"),
		Direction: models.CatalogSortDirection("asc; DROP TABLE events"),
	}
	if got := eventOrderSQL(sort); strings.Contains(got, "DROP") {
		t.Fatalf("an unknown sort field reached the SQL: %q", got)
	}
}
