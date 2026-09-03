//go:build integration

package team_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	svcteam "github.com/GoatWhistle/timeline/internal/services/team"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

type trackFixture struct {
	service *svcteam.TeamService
	teamID  uuid.UUID
	eventID uuid.UUID
	trackID string
	lead    uuid.UUID
}

func newTrackFixture(t *testing.T, startOffset string) trackFixture {
	t.Helper()
	ctx := context.Background()
	pool := testsupport.Pool(t)
	testsupport.Truncate(t, pool)

	f := trackFixture{lead: seedLinkUser(t, pool, "lead-track@example.com", "leadtrack")}

	if err := pool.QueryRow(ctx,
		`INSERT INTO teams (name, lead_user_id) VALUES ('Track Team', $1) RETURNING id`,
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
			team_size_min, team_size_max, prize_pool, prize_currency)
		 VALUES ('Track Hack', 'HACKATHON', 'ONLINE', 'RU', now() + `+startOffset+`,
			now() + interval '30 days', now(), 2, 5, 1000, 'USD')
		 RETURNING id`).Scan(&f.eventID); err != nil {
		t.Fatalf("seeding event: %v", err)
	}
	if _, err := pool.Exec(ctx,
		`INSERT INTO team_event_entries (team_id, event_id) VALUES ($1, $2)`,
		f.teamID, f.eventID); err != nil {
		t.Fatalf("seeding entry: %v", err)
	}
	if err := pool.QueryRow(ctx,
		`INSERT INTO event_tracks (event_id, track_no, name) VALUES ($1, 1, 'Smart city')
		 RETURNING display_id`, f.eventID).Scan(&f.trackID); err != nil {
		t.Fatalf("seeding track: %v", err)
	}

	f.service = newService(t, postgres.NewDB(pool))
	return f
}

func (f trackFixture) listed(t *testing.T) dto.TeamEventEntryResponse {
	t.Helper()
	list, err := f.service.ListEvents(context.Background(),
		models.Actor{UserID: f.lead}, f.teamID)
	if err != nil {
		t.Fatalf("listing the team entries: %v", err)
	}
	if len(list.Items) != 1 {
		t.Fatalf("expected exactly one entry, got %d", len(list.Items))
	}
	return list.Items[0]
}

func TestTrackUnlockedBeforeTheEventStarts(t *testing.T) {
	f := newTrackFixture(t, "interval '1 day'")
	if f.listed(t).TrackLocked {
		t.Fatal("the list reported the track locked while the event has not started")
	}
}

func TestTrackLockedInTheListOnceTheEventStarted(t *testing.T) {
	f := newTrackFixture(t, "- interval '2 days'")
	if !f.listed(t).TrackLocked {
		t.Fatal("the list reported track_locked=false for an event that already started, " +
			"so the client offers a control the server refuses")
	}
}

func TestTrackListAgreesWithTheRefusalOfTheWrite(t *testing.T) {
	f := newTrackFixture(t, "- interval '2 days'")
	ctx := context.Background()

	_, err := f.service.ChooseTrack(ctx, models.Actor{UserID: f.lead}, f.teamID, f.eventID,
		dto.ChooseTrackRequest{TrackID: &f.trackID})
	if !errors.Is(err, models.ErrStateTransition) {
		t.Fatalf("choosing a track after the start must be refused, got %v", err)
	}
	if !f.listed(t).TrackLocked {
		t.Fatal("the write is refused but the list still says the track may be changed")
	}
}

func TestTrackChosenAndReportedWhileUnlocked(t *testing.T) {
	f := newTrackFixture(t, "interval '1 day'")
	ctx := context.Background()

	entry, err := f.service.ChooseTrack(ctx, models.Actor{UserID: f.lead}, f.teamID, f.eventID,
		dto.ChooseTrackRequest{TrackID: &f.trackID})
	if err != nil {
		t.Fatalf("choosing a track before the start: %v", err)
	}
	if entry.Track == nil || entry.Track.ID != f.trackID {
		t.Fatalf("the chosen track is not reported back, got %+v", entry.Track)
	}
	if listed := f.listed(t); listed.Track == nil || listed.Track.ID != f.trackID {
		t.Fatal("the list does not report the track the team chose")
	}
}
