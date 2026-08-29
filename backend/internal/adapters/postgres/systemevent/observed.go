package systemevent

import (
	"context"
	"errors"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (r *Events) StoreObservedState(ctx context.Context, key, state string) (bool, time.Time, error) {
	var changedAt time.Time
	err := r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO observed_states (subject_key, state)
		VALUES ($1, $2)
		ON CONFLICT (subject_key) DO UPDATE
			SET state = EXCLUDED.state, changed_at = now()
			WHERE observed_states.state IS DISTINCT FROM EXCLUDED.state
		RETURNING changed_at`, key, state).Scan(&changedAt)
	if err != nil {
		if mapped := mapError(err); errors.Is(mapped, models.ErrNotFound) {
			return false, time.Time{}, nil
		}
		return false, time.Time{}, mapError(err)
	}
	return true, changedAt, nil
}
