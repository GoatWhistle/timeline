//go:build integration

package notification_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

const candidateBatch = 100

func TestCandidatesForEventMatchesTheFilteredScan(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	repo := notification.NewScheduler(postgres.NewDB(pool))

	events := make([]uuid.UUID, 0, 3)
	for i := range 3 {
		events = append(events, seedCandidateEvent(t, pool, i, 4))
	}

	all, err := scanEveryCandidate(ctx, repo)
	if err != nil {
		t.Fatalf("scanning every candidate: %v", err)
	}
	if len(all) != 12 {
		t.Fatalf("expected 12 candidates across the three events, got %d", len(all))
	}

	for _, eventID := range events {
		scoped, err := repo.CandidatesForEvent(ctx, eventID, uuid.Nil, candidateBatch)
		if err != nil {
			t.Fatalf("scanning one event: %v", err)
		}

		expected := make([]models.ReconcileCandidate, 0, 4)
		for _, c := range all {
			if c.EventID == eventID {
				expected = append(expected, c)
			}
		}

		if len(scoped) != len(expected) {
			t.Fatalf("event %s: scoped returned %d, the filtered scan returned %d",
				eventID, len(scoped), len(expected))
		}
		for i := range scoped {
			if scoped[i] != expected[i] {
				t.Fatalf("event %s row %d differs:\n scoped=%+v\n filtered=%+v",
					eventID, i, scoped[i], expected[i])
			}
		}
	}
}

func TestCandidatesForEventPagesByCursor(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	repo := notification.NewScheduler(postgres.NewDB(pool))

	eventID := seedCandidateEvent(t, pool, 0, 5)
	seedCandidateEvent(t, pool, 1, 5)

	collected := make([]models.ReconcileCandidate, 0, 5)
	cursor := uuid.Nil
	for {
		page, err := repo.CandidatesForEvent(ctx, eventID, cursor, 2)
		if err != nil {
			t.Fatalf("paging: %v", err)
		}
		if len(page) == 0 {
			break
		}
		collected = append(collected, page...)
		cursor = page[len(page)-1].StatusID
		if len(page) < 2 {
			break
		}
	}

	if len(collected) != 5 {
		t.Fatalf("paging returned %d candidates, expected 5", len(collected))
	}
	for _, c := range collected {
		if c.EventID != eventID {
			t.Fatalf("paging leaked a candidate from event %s", c.EventID)
		}
	}
	for i := 1; i < len(collected); i++ {
		if collected[i-1].StatusID.String() >= collected[i].StatusID.String() {
			t.Fatalf("paging returned an unordered or repeated status at %d", i)
		}
	}
}

func scanEveryCandidate(ctx context.Context, repo *notification.Scheduler,
) ([]models.ReconcileCandidate, error) {
	all := make([]models.ReconcileCandidate, 0, 16)
	cursor := uuid.Nil
	for {
		page, err := repo.Candidates(ctx, cursor, candidateBatch)
		if err != nil {
			return nil, err
		}
		if len(page) == 0 {
			return all, nil
		}
		all = append(all, page...)
		cursor = page[len(page)-1].StatusID
		if len(page) < candidateBatch {
			return all, nil
		}
	}
}

func seedCandidateEvent(t *testing.T, pool *pgxpool.Pool, index, participants int) uuid.UUID {
	t.Helper()
	ctx := context.Background()

	var eventID uuid.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO events (title, kind, format, origin, start_at, end_at, published_at)
		VALUES ('Reconcile ' || $1::int, 'HACKATHON', 'ONLINE', 'RU',
			now() + interval '10 days', now() + interval '12 days', now())
		RETURNING id`, index).Scan(&eventID); err != nil {
		t.Fatalf("seeding an event: %v", err)
	}

	var registrationID uuid.UUID
	if err := pool.QueryRow(ctx, `
		INSERT INTO registrations (event_id, url, deadline_at, event_end_at, state)
		SELECT e.id, 'https://example.com/r', e.start_at - interval '1 day', e.end_at, 'ACTIVE'
		FROM events e WHERE e.id = $1
		RETURNING id`, eventID).Scan(&registrationID); err != nil {
		t.Fatalf("seeding a registration: %v", err)
	}

	for i := range participants {
		var userID uuid.UUID
		if err := pool.QueryRow(ctx, `
			INSERT INTO users (email, password_hash, first_name, last_name, nickname, locale, is_active)
			VALUES ('reconcile-' || $1::int || '-' || $2::int || '@example.com', 'x',
				'First', 'Last', 'rec' || $1::int || 'u' || $2::int, 'en', true)
			RETURNING id`, index, i).Scan(&userID); err != nil {
			t.Fatalf("seeding a user: %v", err)
		}

		var participantID uuid.UUID
		if err := pool.QueryRow(ctx, `
			INSERT INTO event_participants (event_id, user_id, participation_status)
			VALUES ($1, $2, 'ASSIGNED') RETURNING id`, eventID, userID).Scan(&participantID); err != nil {
			t.Fatalf("seeding a participant: %v", err)
		}
		if _, err := pool.Exec(ctx, `
			INSERT INTO registration_statuses (event_id, registration_id, participant_id, status)
			VALUES ($1, $2, $3, 'TODO')`, eventID, registrationID, participantID); err != nil {
			t.Fatalf("seeding a status: %v", err)
		}
	}
	return eventID
}
