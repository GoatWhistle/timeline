//go:build integration

package event_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func repo(t *testing.T) (*event.Events, *pgxpool.Pool) {
	t.Helper()
	pool := testsupport.Pool(t)
	return event.NewEvents(postgres.NewDB(pool)), pool
}

func insertEvent(t *testing.T, pool *pgxpool.Pool, origin models.EventOrigin) uuid.UUID {
	t.Helper()
	start := time.Now().UTC().Truncate(time.Second)
	var id uuid.UUID
	err := pool.QueryRow(context.Background(), `
		INSERT INTO events (title, origin, start_at, end_at)
		VALUES ('Colour subject', $1, $2, $3) RETURNING id`,
		string(origin), start, start.Add(48*time.Hour)).Scan(&id)
	if err != nil {
		t.Fatalf("inserting an event: %v", err)
	}
	return id
}

func slotOf(t *testing.T, pool *pgxpool.Pool, id uuid.UUID) *int {
	t.Helper()
	var slot *int
	if err := pool.QueryRow(context.Background(),
		`SELECT color_slot FROM events WHERE id = $1`, id).Scan(&slot); err != nil {
		t.Fatalf("reading the slot: %v", err)
	}
	return slot
}

func TestEveryEventOfAFamilyGetsItsOwnSlot(t *testing.T) {
	events, pool := repo(t)
	ctx := context.Background()

	seen := map[int]uuid.UUID{}
	for i := 0; i < models.EventColorSlots; i++ {
		id := insertEvent(t, pool, models.OriginRU)
		claim, err := events.ClaimFreeColor(ctx, id, models.OriginRU)
		if err != nil {
			t.Fatalf("claiming a colour: %v", err)
		}
		if claim == nil {
			t.Fatalf("the palette ran out after %d events, it holds %d", i, models.EventColorSlots)
		}
		if other, taken := seen[claim.Slot]; taken {
			t.Fatalf("slot %d handed to %s and again to %s", claim.Slot, other, id)
		}
		seen[claim.Slot] = id
	}
	if len(seen) != models.EventColorSlots {
		t.Fatalf("the family used %d slots, expected %d", len(seen), models.EventColorSlots)
	}
}

func TestTheTwoFamiliesDoNotShareAPool(t *testing.T) {
	events, pool := repo(t)
	ctx := context.Background()

	for i := 0; i < models.EventColorSlots; i++ {
		id := insertEvent(t, pool, models.OriginRU)
		if _, err := events.ClaimFreeColor(ctx, id, models.OriginRU); err != nil {
			t.Fatalf("filling the RU family: %v", err)
		}
	}

	world := insertEvent(t, pool, models.OriginWorld)
	claim, err := events.ClaimFreeColor(ctx, world, models.OriginWorld)
	if err != nil {
		t.Fatalf("claiming a world colour: %v", err)
	}
	if claim == nil {
		t.Fatal("a full RU family exhausted the world family as well")
	}
	if !models.ValidEventColorSlot(claim.Slot) {
		t.Fatalf("the world family took slot %d, outside the palette", claim.Slot)
	}
}

func TestConcurrentCreationNeverHandsOutTheSameColourTwice(t *testing.T) {
	events, pool := repo(t)
	ctx := context.Background()

	const racers = models.EventColorSlots
	ids := make([]uuid.UUID, racers)
	for i := range ids {
		ids[i] = insertEvent(t, pool, models.OriginRU)
	}

	var (
		start sync.WaitGroup
		done  sync.WaitGroup
		mu    sync.Mutex
	)
	start.Add(1)
	slots := map[int]uuid.UUID{}
	failures := make([]error, 0, racers)

	for _, id := range ids {
		done.Add(1)
		go func(id uuid.UUID) {
			defer done.Done()
			start.Wait()
			var claim *models.EventColorClaim
			var err error
			for attempt := 0; attempt < 8; attempt++ {
				claim, err = events.ClaimFreeColor(ctx, id, models.OriginRU)
				if err == nil {
					break
				}
			}
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				failures = append(failures, err)
				return
			}
			if claim == nil {
				return
			}
			if other, taken := slots[claim.Slot]; taken {
				failures = append(failures,
					errDuplicate{slot: claim.Slot, first: other, second: id})
				return
			}
			slots[claim.Slot] = id
		}(id)
	}

	start.Done()
	done.Wait()

	for _, err := range failures {
		t.Errorf("the race left a defect: %v", err)
	}
	if len(slots) != racers {
		t.Fatalf("%d racers took %d distinct slots", racers, len(slots))
	}
	live := liveSlots(t, pool, models.OriginRU)
	if len(live) != racers {
		t.Fatalf("the table holds %d distinct live slots, expected %d", len(live), racers)
	}
}

func liveSlots(t *testing.T, pool *pgxpool.Pool, origin models.EventOrigin) map[int]int {
	t.Helper()
	rows, err := pool.Query(context.Background(), `
		SELECT color_slot, count(*) FROM events
		WHERE origin = $1 AND color_slot IS NOT NULL AND archived_at IS NULL
		GROUP BY color_slot`, string(origin))
	if err != nil {
		t.Fatalf("reading live slots: %v", err)
	}
	defer rows.Close()
	found := map[int]int{}
	for rows.Next() {
		var slot, count int
		if err := rows.Scan(&slot, &count); err != nil {
			t.Fatalf("scanning live slots: %v", err)
		}
		if count > 1 {
			t.Fatalf("slot %d is held by %d live events at once", slot, count)
		}
		found[slot] = count
	}
	return found
}

type errDuplicate struct {
	slot          int
	first, second uuid.UUID
}

func (e errDuplicate) Error() string {
	return "slot " + itoa(e.slot) + " was handed to " + e.first.String() + " and " + e.second.String()
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	digits := ""
	for v > 0 {
		digits = string(rune('0'+v%10)) + digits
		v /= 10
	}
	return digits
}
