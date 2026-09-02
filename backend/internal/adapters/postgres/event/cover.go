package event

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (r *Events) SetManualCover(ctx context.Context, id uuid.UUID, url *string) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET cover_manual_url = $2
		WHERE id = $1
		RETURNING `+eventColumns, id, url))
}

func (r *Events) SetAutoCover(ctx context.Context, id uuid.UUID, url *string, source *string,
	fetchedAt *time.Time) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET cover_auto_url = $2, cover_auto_source = $3, cover_auto_fetched_at = $4
		WHERE id = $1
		RETURNING `+eventColumns, id, url, source, fetchedAt))
}

func (r *Events) Delete(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		DELETE FROM events WHERE id = $1 RETURNING `+eventColumns, id))
}
