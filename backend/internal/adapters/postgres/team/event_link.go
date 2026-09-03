package team

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type EventLinks struct{ db *postgres.DB }

func NewEventLinks(db *postgres.DB) *EventLinks { return &EventLinks{db: db} }

const eventLinkColumns = `id, display_id, entry_id,
	(SELECT en.display_id FROM team_event_entries en WHERE en.id = entry_id),
	created_by, url, label, sort_order, created_at, updated_at`

func scanEventLink(row pgx.Row) (*models.TeamEventLink, error) {
	var l models.TeamEventLink
	if err := row.Scan(&l.ID, &l.DisplayID, &l.EntryID, &l.EntryDisplayID, &l.CreatedBy,
		&l.URL, &l.Label, &l.SortOrder, &l.CreatedAt, &l.UpdatedAt); err != nil {
		return nil, mapError(err)
	}
	return &l, nil
}

func (r *EventLinks) ListByEntry(ctx context.Context, entryID uuid.UUID) ([]models.TeamEventLink, error) {
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT `+eventLinkColumns+` FROM team_event_links
		 WHERE entry_id = $1 ORDER BY sort_order, created_at`, entryID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.TeamEventLink, 0, models.TeamEventLinkMaxPerEntry)
	for rows.Next() {
		var l models.TeamEventLink
		if err := rows.Scan(&l.ID, &l.DisplayID, &l.EntryID, &l.EntryDisplayID, &l.CreatedBy,
			&l.URL, &l.Label, &l.SortOrder, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, l)
	}
	return items, mapError(rows.Err())
}

func (r *EventLinks) CountByEntry(ctx context.Context, entryID uuid.UUID) (int, error) {
	var count int
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM team_event_links WHERE entry_id = $1`, entryID).Scan(&count)
	return count, mapError(err)
}

func (r *EventLinks) Create(ctx context.Context, entryID, authorID uuid.UUID,
	url string, label *string) (*models.TeamEventLink, error) {
	return scanEventLink(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO team_event_links (entry_id, created_by, url, label, sort_order)
		VALUES ($1, $2, $3, $4,
			COALESCE((SELECT max(sort_order) + 1 FROM team_event_links WHERE entry_id = $1), 0))
		RETURNING `+eventLinkColumns, entryID, authorID, url, label))
}

func (r *EventLinks) GetByID(ctx context.Context, id uuid.UUID) (*models.TeamEventLink, error) {
	return scanEventLink(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+eventLinkColumns+` FROM team_event_links WHERE id = $1`, id))
}

func (r *EventLinks) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM team_event_links WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("team link not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *EventLinks) Update(ctx context.Context, id uuid.UUID,
	patch dto.TeamEventLinkPatch) (*models.TeamEventLink, error) {
	if patch.URL == nil && !patch.LabelSet {
		return r.GetByID(ctx, id)
	}
	return scanEventLink(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE team_event_links SET
			url = COALESCE($2, url),
			label = CASE WHEN $3 THEN $4 ELSE label END
		WHERE id = $1
		RETURNING `+eventLinkColumns, id, patch.URL, patch.LabelSet, patch.Label))
}

func (r *EventLinks) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `DELETE FROM team_event_links WHERE id = $1`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *EventLinks) Reorder(ctx context.Context, entryID uuid.UUID, ids []uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE team_event_links AS l SET sort_order = ordered.position
		FROM (SELECT id, ordinality - 1 AS position
		      FROM unnest($2::uuid[]) WITH ORDINALITY AS t(id, ordinality)) AS ordered
		WHERE l.id = ordered.id AND l.entry_id = $1`, entryID, ids)
	if err != nil {
		return mapError(err)
	}
	if int(tag.RowsAffected()) != len(ids) {
		return models.ErrNotFound
	}
	return nil
}
