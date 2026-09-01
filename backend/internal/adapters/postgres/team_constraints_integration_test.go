//go:build integration

package postgres_test

import (
	"context"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestTeamSizeMinIsBoundedAndNotAboveTheMaximum(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)

	insert := `
		INSERT INTO events (title, start_at, end_at, team_size_min, team_size_max)
		VALUES ('Bounded event', $1, $2, $3, $4)`

	_, err := pool.Exec(ctx, insert, start, start.Add(48*time.Hour), 0, nil)
	requireConstraint(t, err, "events_team_size_min_positive")

	_, err = pool.Exec(ctx, insert, start, start.Add(48*time.Hour), 101, nil)
	requireConstraint(t, err, "events_team_size_min_positive")

	_, err = pool.Exec(ctx, insert, start, start.Add(48*time.Hour), 5, 3)
	requireConstraint(t, err, "events_team_size_range")

	if _, err := pool.Exec(ctx, insert, start, start.Add(48*time.Hour), 3, 5); err != nil {
		t.Fatalf("a minimum below the maximum was rejected: %v", err)
	}
	if _, err := pool.Exec(ctx, insert, start, start.Add(48*time.Hour), 4, 4); err != nil {
		t.Fatalf("an equal minimum and maximum was rejected: %v", err)
	}
	if _, err := pool.Exec(ctx, insert, start, start.Add(48*time.Hour), nil, 5); err != nil {
		t.Fatalf("a maximum without a minimum was rejected: %v", err)
	}
}

func TestTeamMembershipIsUniquePerTeamAndStatesAreConsistent(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()

	lead := insertUser(t, pool, "team-lead@example.com")
	mate := insertUser(t, pool, "team-mate@example.com")

	var teamID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO teams (name, lead_user_id) VALUES ('Constraint crew', $1) RETURNING id`,
		lead).Scan(&teamID); err != nil {
		t.Fatalf("creating a team: %v", err)
	}

	if _, err := pool.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, state, joined_at)
		 VALUES ($1, $2, 'ACTIVE', now())`, teamID, mate); err != nil {
		t.Fatalf("adding a member: %v", err)
	}
	_, err := pool.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)`, teamID, mate)
	requireConstraint(t, err, "team_members_team_user_key")

	_, err = pool.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, state, joined_at)
		 VALUES ($1, $2, 'INVITED', now())`, teamID, lead)
	requireConstraint(t, err, "team_members_invited_consistency")

	_, err = pool.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, state) VALUES ($1, $2, 'ACTIVE')`, teamID, lead)
	requireConstraint(t, err, "team_members_active_consistency")

	_, err = pool.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, state, joined_at)
		 VALUES ($1, $2, 'LEFT', now())`, teamID, lead)
	requireConstraint(t, err, "team_members_left_consistency")
}

func TestATeamEntersAnEventOnlyOnce(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)

	lead := insertUser(t, pool, "entry-lead@example.com")
	event := insertEvent(t, pool, start, start.Add(48*time.Hour))

	var teamID string
	if err := pool.QueryRow(ctx,
		`INSERT INTO teams (name, lead_user_id) VALUES ('Entry crew', $1) RETURNING id`,
		lead).Scan(&teamID); err != nil {
		t.Fatalf("creating a team: %v", err)
	}

	insert := `INSERT INTO team_event_entries (team_id, event_id) VALUES ($1, $2)`
	if _, err := pool.Exec(ctx, insert, teamID, event); err != nil {
		t.Fatalf("entering the event: %v", err)
	}
	_, err := pool.Exec(ctx, insert, teamID, event)
	requireConstraint(t, err, "team_event_entries_team_event_key")
}
