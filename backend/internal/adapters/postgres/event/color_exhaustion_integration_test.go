//go:build integration

package event_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/GoatWhistle/timeline/internal/models"
)

func requireUniqueViolation(t *testing.T, err error, constraint string) {
	t.Helper()
	if err == nil {
		t.Fatalf("expected %s to reject the write, it went through", constraint)
	}
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		t.Fatalf("expected a PostgreSQL error, got: %v", err)
	}
	if pgErr.ConstraintName != constraint {
		t.Fatalf("expected %s, violated %s (%s)", constraint, pgErr.ConstraintName, pgErr.Message)
	}
}

func TestAFullPaletteHandsOutNoFreeSlot(t *testing.T) {
	events, pool := repo(t)
	ctx := context.Background()

	for i := 0; i < models.EventColorSlots; i++ {
		id := insertEvent(t, pool, models.OriginRU)
		if _, err := events.ClaimFreeColor(ctx, id, models.OriginRU); err != nil {
			t.Fatalf("filling the palette: %v", err)
		}
	}

	extra := insertEvent(t, pool, models.OriginRU)
	claim, err := events.ClaimFreeColor(ctx, extra, models.OriginRU)
	if err != nil {
		t.Fatalf("claiming past the end of the palette: %v", err)
	}
	if claim != nil {
		t.Fatalf("a full palette still handed out slot %d: a duplicate would follow", claim.Slot)
	}
	if slot := slotOf(t, pool, extra); slot != nil {
		t.Fatalf("the event was painted %d without a free slot", *slot)
	}
}

func TestExhaustionRecyclesTheLeastRecentlyAssignedColour(t *testing.T) {
	events, pool := repo(t)
	ctx := context.Background()

	first := uuid.Nil
	var firstSlot int
	for i := 0; i < models.EventColorSlots; i++ {
		id := insertEvent(t, pool, models.OriginRU)
		claim, err := events.ClaimFreeColor(ctx, id, models.OriginRU)
		if err != nil || claim == nil {
			t.Fatalf("filling the palette: claim=%v err=%v", claim, err)
		}
		if i == 0 {
			first, firstSlot = id, claim.Slot
		}
	}

	newcomer := insertEvent(t, pool, models.OriginRU)
	claim, err := events.RecycleOldestColor(ctx, newcomer, models.OriginRU)
	if err != nil {
		t.Fatalf("recycling: %v", err)
	}
	if claim == nil {
		t.Fatal("a full palette recycled nothing, the newcomer stays colourless")
	}
	if claim.Slot != firstSlot {
		t.Fatalf("recycled slot %d, expected the least recently assigned %d", claim.Slot, firstSlot)
	}
	if slot := slotOf(t, pool, first); slot != nil {
		t.Fatalf("the previous holder kept slot %d, so two events now share a colour", *slot)
	}
	if live := liveSlots(t, pool, models.OriginRU); len(live) != models.EventColorSlots {
		t.Fatalf("after recycling the family holds %d live slots, expected %d",
			len(live), models.EventColorSlots)
	}
}

func TestArchivingFreesTheColourForTheNextEvent(t *testing.T) {
	events, pool := repo(t)
	ctx := context.Background()

	var freed int
	var holder uuid.UUID
	for i := 0; i < models.EventColorSlots; i++ {
		id := insertEvent(t, pool, models.OriginRU)
		claim, err := events.ClaimFreeColor(ctx, id, models.OriginRU)
		if err != nil || claim == nil {
			t.Fatalf("filling the palette: claim=%v err=%v", claim, err)
		}
		if i == 3 {
			holder, freed = id, claim.Slot
		}
	}

	if err := events.ReleaseColor(ctx, holder); err != nil {
		t.Fatalf("releasing: %v", err)
	}

	next := insertEvent(t, pool, models.OriginRU)
	claim, err := events.ClaimFreeColor(ctx, next, models.OriginRU)
	if err != nil {
		t.Fatalf("claiming the freed slot: %v", err)
	}
	if claim == nil {
		t.Fatal("the freed slot was not handed to the next event")
	}
	if claim.Slot != freed {
		t.Fatalf("took slot %d, expected the freed %d", claim.Slot, freed)
	}
}

func TestTheDatabaseRefusesTwoLiveEventsOnOneColour(t *testing.T) {
	events, pool := repo(t)
	ctx := context.Background()

	first := insertEvent(t, pool, models.OriginRU)
	claim, err := events.ClaimFreeColor(ctx, first, models.OriginRU)
	if err != nil || claim == nil {
		t.Fatalf("claiming: claim=%v err=%v", claim, err)
	}

	second := insertEvent(t, pool, models.OriginRU)
	_, err = pool.Exec(ctx,
		`UPDATE events SET color_slot = $2, color_assigned_at = now() WHERE id = $1`,
		second, claim.Slot)
	requireUniqueViolation(t, err, "events_color_slot_live_key")
}
