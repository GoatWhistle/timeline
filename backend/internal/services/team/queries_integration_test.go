//go:build integration

package team_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func TestListEventsQueryCount(t *testing.T) {
	counter := &queryCounter{}
	pool := countingPool(t, counter)
	teamID, lead := seedTeamWithEvents(t, pool)

	db := postgres.NewDB(pool)
	service := newService(t, db)

	counter.n.Store(0)
	result, err := service.ListEvents(context.Background(), models.Actor{UserID: lead}, teamID)
	if err != nil {
		t.Fatalf("listing team events: %v", err)
	}
	queries := counter.n.Load()

	if len(result.Items) != seededEvents {
		t.Fatalf("expected %d entries, got %d", seededEvents, len(result.Items))
	}
	t.Logf("ListEvents over %d entries issued %d queries", seededEvents, queries)

	if queries > 8 {
		t.Fatalf("ListEvents issued %d queries for %d entries: the query count must not "+
			"grow per entry", queries, seededEvents)
	}

	for i := seededEvents; i < seededEvents*3; i++ {
		addEntry(t, pool, teamID, i)
	}

	counter.n.Store(0)
	grown, err := service.ListEvents(context.Background(), models.Actor{UserID: lead}, teamID)
	if err != nil {
		t.Fatalf("listing the grown team: %v", err)
	}
	if len(grown.Items) != seededEvents*3 {
		t.Fatalf("expected %d entries, got %d", seededEvents*3, len(grown.Items))
	}
	if grownQueries := counter.n.Load(); grownQueries != queries {
		t.Fatalf("the query count moved from %d to %d when the entries tripled: it must stay "+
			"constant", queries, grownQueries)
	}
}

func TestListTeamsQueryCount(t *testing.T) {
	counter := &queryCounter{}
	pool := countingPool(t, counter)
	_, lead := seedTeamWithEvents(t, pool)

	ctx := context.Background()
	for i := range 4 {
		var other uuid.UUID
		if err := pool.QueryRow(ctx, `
			INSERT INTO teams (name, lead_user_id) VALUES ('Other ' || $1::int, $2) RETURNING id`,
			i, lead).Scan(&other); err != nil {
			t.Fatalf("seeding a team: %v", err)
		}
		if _, err := pool.Exec(ctx, `
			INSERT INTO team_members (team_id, user_id, state, joined_at)
			VALUES ($1, $2, 'ACTIVE', now())`, other, lead); err != nil {
			t.Fatalf("seeding a membership: %v", err)
		}
	}

	db := postgres.NewDB(pool)
	service := newService(t, db)

	counter.n.Store(0)
	result, err := service.List(ctx, models.Actor{UserID: lead})
	if err != nil {
		t.Fatalf("listing teams: %v", err)
	}
	queries := counter.n.Load()

	if len(result.Items) != 5 {
		t.Fatalf("expected 5 teams, got %d", len(result.Items))
	}
	t.Logf("List over %d teams issued %d queries", len(result.Items), queries)

	if queries > 4 {
		t.Fatalf("List issued %d queries for %d teams: the query count must not grow per team",
			queries, len(result.Items))
	}
}

func TestListEventsMatchesPerEntryStanding(t *testing.T) {
	counter := &queryCounter{}
	pool := countingPool(t, counter)
	teamID, lead := seedTeamWithEvents(t, pool)

	db := postgres.NewDB(pool)
	service := newService(t, db)
	ctx := context.Background()
	actor := models.Actor{UserID: lead}

	listed, err := service.ListEvents(ctx, actor, teamID)
	if err != nil {
		t.Fatalf("listing team events: %v", err)
	}

	for _, item := range listed.Items {
		eventID := resolveEventUUID(t, pool, item.EventID)
		single, err := service.EventStanding(ctx, actor, teamID, eventID)
		if err != nil {
			t.Fatalf("reading a single standing: %v", err)
		}
		assertSameEntry(t, item, *single)
	}
}

func resolveEventUUID(t *testing.T, pool *pgxpool.Pool, displayID string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := pool.QueryRow(context.Background(),
		`SELECT id FROM events WHERE display_id = $1`, displayID).Scan(&id); err != nil {
		t.Fatalf("resolving the event: %v", err)
	}
	return id
}

func assertSameEntry(t *testing.T, listed, single dto.TeamEventEntryResponse) {
	t.Helper()
	if listed.ID != single.ID || listed.TeamID != single.TeamID ||
		listed.EventID != single.EventID || listed.EventTitle != single.EventTitle {
		t.Fatalf("identity differs between the list and the single read:\n list=%+v\n one=%+v",
			listed, single)
	}
	if listed.RosterSize != single.RosterSize ||
		listed.AssignedMembers != single.AssignedMembers ||
		listed.RegisteredCount != single.RegisteredCount ||
		listed.Registered != single.Registered {
		t.Fatalf("standing differs between the list and the single read:\n list=%+v\n one=%+v",
			listed, single)
	}
	if len(listed.Roster) != len(single.Roster) {
		t.Fatalf("roster size differs: list=%d one=%d", len(listed.Roster), len(single.Roster))
	}
	for i := range listed.Roster {
		if listed.Roster[i] != single.Roster[i] {
			t.Fatalf("roster row %d differs:\n list=%+v\n one=%+v", i,
				listed.Roster[i], single.Roster[i])
		}
	}
}
