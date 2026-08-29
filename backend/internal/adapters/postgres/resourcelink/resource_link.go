package resourcelink

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Links struct{ db *postgres.DB }

func NewLinks(db *postgres.DB) *Links { return &Links{db: db} }

const linkColumns = `id, event_id, stage_id, kind, url, title, is_pinned,
	sort_order, created_at, updated_at`

func scanLink(row pgx.Row) (*models.ResourceLink, error) {
	var l models.ResourceLink
	err := row.Scan(&l.ID, &l.EventID, &l.StageID, &l.Kind, &l.URL, &l.Title,
		&l.IsPinned, &l.SortOrder, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &l, nil
}

func (r *Links) Create(ctx context.Context, eventID uuid.UUID, stageID *uuid.UUID,
	kind models.LinkKind, url string, title *string, pinned bool, sortOrder int) (*models.ResourceLink, error) {
	var stageEventID *uuid.UUID
	if stageID != nil {
		stageEventID = &eventID
	}
	return scanLink(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO resource_links (event_id, stage_id, stage_event_id, kind, url, title, is_pinned, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING `+linkColumns, eventID, stageID, stageEventID, kind, url, title, pinned, sortOrder))
}

func (r *Links) Get(ctx context.Context, eventID, id uuid.UUID) (*models.ResourceLink, error) {
	return scanLink(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+linkColumns+` FROM resource_links WHERE id = $1 AND event_id = $2`,
		id, eventID))
}

func (r *Links) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]models.ResourceLink, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+linkColumns+` FROM resource_links
		WHERE event_id = $1
		ORDER BY is_pinned DESC, sort_order, created_at`, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	return collect(rows)
}

func (r *Links) ListByEvents(ctx context.Context, eventIDs []uuid.UUID) ([]models.ResourceLink, error) {
	if len(eventIDs) == 0 {
		return nil, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+linkColumns+` FROM resource_links
		WHERE event_id = ANY($1)
		ORDER BY event_id, is_pinned DESC, sort_order, created_at`, eventIDs)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	return collect(rows)
}

func collect(rows pgx.Rows) ([]models.ResourceLink, error) {
	items := make([]models.ResourceLink, 0, 16)
	for rows.Next() {
		var l models.ResourceLink
		if err := rows.Scan(&l.ID, &l.EventID, &l.StageID, &l.Kind, &l.URL, &l.Title,
			&l.IsPinned, &l.SortOrder, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, l)
	}
	return items, mapError(rows.Err())
}

func (r *Links) Update(ctx context.Context, eventID, id uuid.UUID,
	patch models.ResourceLinkPatch) (*models.ResourceLink, error) {
	sets := make([]string, 0, 6)
	args := []any{id, eventID}

	if patch.Kind != nil {
		args = append(args, *patch.Kind)
		sets = append(sets, "kind = $"+itoa(len(args)))
	}
	if patch.URL != nil {
		args = append(args, *patch.URL)
		sets = append(sets, "url = $"+itoa(len(args)))
	}
	if patch.TitleSet {
		args = append(args, patch.Title)
		sets = append(sets, "title = $"+itoa(len(args)))
	}
	if patch.StageSet {
		args = append(args, patch.StageID)
		sets = append(sets, "stage_id = $"+itoa(len(args)))
		if patch.StageID == nil {
			sets = append(sets, "stage_event_id = NULL")
		} else {
			sets = append(sets, "stage_event_id = event_id")
		}
	}
	if patch.IsPinned != nil {
		args = append(args, *patch.IsPinned)
		sets = append(sets, "is_pinned = $"+itoa(len(args)))
	}
	if patch.SortOrder != nil {
		args = append(args, *patch.SortOrder)
		sets = append(sets, "sort_order = $"+itoa(len(args)))
	}
	if len(sets) == 0 {
		return r.Get(ctx, eventID, id)
	}

	query := `UPDATE resource_links SET ` + join(sets) +
		` WHERE id = $1 AND event_id = $2 RETURNING ` + linkColumns
	return scanLink(r.db.Q(ctx).QueryRow(ctx, query, args...))
}

func (r *Links) Delete(ctx context.Context, eventID, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM resource_links WHERE id = $1 AND event_id = $2`, id, eventID)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Links) NextSortOrder(ctx context.Context, eventID uuid.UUID) (int, error) {
	var next int
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT coalesce(max(sort_order) + 1, 0) FROM resource_links
		WHERE event_id = $1`, eventID).Scan(&next)
	return next, mapError(err)
}

func (r *Links) CountByEvent(ctx context.Context, eventID uuid.UUID) (int, error) {
	var total int
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM resource_links WHERE event_id = $1`, eventID).Scan(&total)
	return total, mapError(err)
}
