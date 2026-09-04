//go:build integration

package team_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	svcteam "github.com/GoatWhistle/timeline/internal/services/team"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type entryWindowFixture struct {
	service *svcteam.TeamService
	pool    *pgxpool.Pool
	teamID  uuid.UUID
	eventID string
	eventPK uuid.UUID
	lead    uuid.UUID
}

func newEntryWindowFixture(t *testing.T, startOffset, endOffset string) entryWindowFixture {
	t.Helper()
	ctx := context.Background()
	pool := testsupport.Pool(t)
	testsupport.Truncate(t, pool)

	f := entryWindowFixture{
		pool: pool,
		lead: seedLinkUser(t, pool, "lead-window@example.com", "leadwindow"),
	}

	if err := pool.QueryRow(ctx,
		`INSERT INTO teams (name, lead_user_id) VALUES ('Window Team', $1) RETURNING id`,
		f.lead).Scan(&f.teamID); err != nil {
		t.Fatalf("seeding team: %v", err)
	}
	if _, err := pool.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, state, joined_at)
		 VALUES ($1, $2, 'ACTIVE', now())`, f.teamID, f.lead); err != nil {
		t.Fatalf("seeding membership: %v", err)
	}

	if err := pool.QueryRow(ctx,
		`INSERT INTO events (title, kind, format, origin, start_at, end_at, published_at,
			team_size_min, team_size_max)
		 VALUES ('Window Hack', 'HACKATHON', 'ONLINE', 'RU', now() + `+startOffset+`,
			now() + `+endOffset+`, now(), 2, 5)
		 RETURNING id, display_id`).Scan(&f.eventPK, &f.eventID); err != nil {
		t.Fatalf("seeding event: %v", err)
	}

	f.service = newService(t, postgres.NewDB(pool))
	return f
}

func (f entryWindowFixture) enter(t *testing.T) error {
	t.Helper()
	_, err := f.service.EnterEvent(context.Background(), models.Actor{UserID: f.lead},
		f.teamID, f.eventPK, dto.EnterEventRequest{EventID: f.eventID})
	return err
}

func (f entryWindowFixture) entryCount(t *testing.T) int {
	t.Helper()
	var n int
	if err := f.pool.QueryRow(context.Background(),
		`SELECT count(*) FROM team_event_entries WHERE team_id = $1 AND event_id = $2`,
		f.teamID, f.eventPK).Scan(&n); err != nil {
		t.Fatalf("counting entries: %v", err)
	}
	return n
}

func (f entryWindowFixture) auditCount(t *testing.T) int {
	t.Helper()
	var n int
	if err := f.pool.QueryRow(context.Background(),
		`SELECT count(*) FROM audit_log WHERE action = $1`,
		string(models.AuditTeamEventEnter)).Scan(&n); err != nil {
		t.Fatalf("counting audit rows: %v", err)
	}
	return n
}

func TestEnterFinishedHackathonIsRefused(t *testing.T) {
	f := newEntryWindowFixture(t, "- interval '10 days'", "- interval '3 days'")

	err := f.enter(t)
	if err == nil {
		t.Fatal("a team entered a hackathon that already finished: the entry is a dead end, " +
			"its track can never be set and there is no way out")
	}
	if !errors.Is(err, models.ErrStateTransition) {
		t.Fatalf("entering a finished hackathon must be refused with invalid_state_transition, "+
			"got %v", err)
	}
}

func TestRefusedEntryToFinishedHackathonWritesNothing(t *testing.T) {
	f := newEntryWindowFixture(t, "- interval '10 days'", "- interval '3 days'")

	if err := f.enter(t); err == nil {
		t.Fatal("expected the entry to a finished hackathon to be refused")
	}
	if n := f.entryCount(t); n != 0 {
		t.Fatalf("the refusal still wrote the entry: %d rows in team_event_entries, "+
			"a refused transition must not change the data", n)
	}
	if n := f.auditCount(t); n != 0 {
		t.Fatalf("the refusal still recorded %d audit rows for an entry that never happened", n)
	}

	list, err := f.service.ListEvents(context.Background(),
		models.Actor{UserID: f.lead}, f.teamID)
	if err != nil {
		t.Fatalf("listing after the refusal: %v", err)
	}
	if len(list.Items) != 0 {
		t.Fatalf("the refused entry is visible to the team: %d items", len(list.Items))
	}
}

func TestEnterRunningHackathonIsStillAllowed(t *testing.T) {
	f := newEntryWindowFixture(t, "- interval '1 day'", "interval '1 day'")

	if err := f.enter(t); err != nil {
		t.Fatalf("a hackathon that is running must still accept a team entry: %v", err)
	}
	if n := f.entryCount(t); n != 1 {
		t.Fatalf("expected exactly one entry after entering a running hackathon, got %d", n)
	}
}

func TestEnterUpcomingHackathonIsAllowed(t *testing.T) {
	f := newEntryWindowFixture(t, "interval '1 day'", "interval '2 days'")

	if err := f.enter(t); err != nil {
		t.Fatalf("an upcoming hackathon must accept a team entry: %v", err)
	}
	if n := f.entryCount(t); n != 1 {
		t.Fatalf("expected exactly one entry after entering an upcoming hackathon, got %d", n)
	}
}
