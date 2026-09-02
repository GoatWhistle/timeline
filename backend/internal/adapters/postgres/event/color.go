package event

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/models"
)

const claimFreeSlot = `
	WITH free AS (
		SELECT slot FROM generate_series(0, $3::int - 1) AS slot
		EXCEPT
		SELECT color_slot FROM events
		WHERE origin = $2 AND color_slot IS NOT NULL AND archived_at IS NULL
	)
	UPDATE events SET color_slot = (SELECT slot FROM free ORDER BY random() LIMIT 1),
		color_assigned_at = now()
	WHERE id = $1 AND EXISTS (SELECT 1 FROM free)
	RETURNING color_slot, color_assigned_at`

const stealSlot = `
	WITH victim AS (
		SELECT id, color_slot FROM events
		WHERE origin = $2 AND color_slot IS NOT NULL AND archived_at IS NULL AND id <> $1
		ORDER BY color_assigned_at, id
		LIMIT 1
	), cleared AS (
		UPDATE events SET color_slot = NULL, color_assigned_at = NULL
		WHERE id = (SELECT id FROM victim)
		RETURNING id
	)
	UPDATE events SET color_slot = (SELECT color_slot FROM victim), color_assigned_at = now()
	WHERE id = $1 AND EXISTS (SELECT 1 FROM cleared)
	RETURNING color_slot, color_assigned_at`

func (r *Events) ReleaseColor(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE events SET color_slot = NULL, color_assigned_at = NULL WHERE id = $1`, id)
	return mapError(err)
}

func (r *Events) ClaimFreeColor(ctx context.Context, id uuid.UUID,
	origin models.EventOrigin) (*models.EventColorClaim, error) {
	return scanClaim(r.db.Q(ctx).QueryRow(ctx, claimFreeSlot, id, string(origin), models.EventColorSlots))
}

func (r *Events) RecycleOldestColor(ctx context.Context, id uuid.UUID,
	origin models.EventOrigin) (*models.EventColorClaim, error) {
	return scanClaim(r.db.Q(ctx).QueryRow(ctx, stealSlot, id, string(origin)))
}

func scanClaim(row pgx.Row) (*models.EventColorClaim, error) {
	var claim models.EventColorClaim
	err := row.Scan(&claim.Slot, &claim.AssignedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, mapError(err)
	}
	return &claim, nil
}
