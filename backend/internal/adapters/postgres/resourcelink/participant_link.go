package resourcelink

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type PersonalLinks struct{ db *postgres.DB }

func NewPersonalLinks(db *postgres.DB) *PersonalLinks { return &PersonalLinks{db: db} }

const personalColumns = `id, display_id, event_id,
	(SELECT e.display_id FROM events e WHERE e.id = event_id),
	kind, url, title, sort_order, created_at, updated_at`

func scanPersonal(row pgx.Row) (*models.ParticipantLink, error) {
	var l models.ParticipantLink
	err := row.Scan(&l.ID, &l.DisplayID, &l.EventID, &l.EventDisplayID, &l.Kind, &l.URL, &l.Title,
		&l.SortOrder, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &l, nil
}

func (r *PersonalLinks) Create(ctx context.Context, userID, eventID uuid.UUID,
	kind models.LinkKind, url string, title *string, sortOrder int) (*models.ParticipantLink, error) {
	return scanPersonal(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO participant_links (user_id, event_id, kind, url, title, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+personalColumns, userID, eventID, kind, url, title, sortOrder))
}

func (r *PersonalLinks) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM participant_links WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("personal link not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *PersonalLinks) GetOwned(ctx context.Context, userID, id uuid.UUID) (*models.ParticipantLink, error) {
	return scanPersonal(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+personalColumns+` FROM participant_links WHERE id = $1 AND user_id = $2`,
		id, userID))
}

func (r *PersonalLinks) ListByEvent(ctx context.Context, userID, eventID uuid.UUID) ([]models.ParticipantLink, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+personalColumns+` FROM participant_links
		WHERE user_id = $1 AND event_id = $2
		ORDER BY sort_order, created_at`, userID, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	return collectPersonal(rows)
}

func collectPersonal(rows pgx.Rows) ([]models.ParticipantLink, error) {
	items := make([]models.ParticipantLink, 0, 8)
	for rows.Next() {
		var l models.ParticipantLink
		if err := rows.Scan(&l.ID, &l.DisplayID, &l.EventID, &l.EventDisplayID, &l.Kind, &l.URL, &l.Title,
			&l.SortOrder, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, l)
	}
	return items, mapError(rows.Err())
}

func (r *PersonalLinks) Update(ctx context.Context, userID, id uuid.UUID,
	patch models.ParticipantLinkPatch) (*models.ParticipantLink, error) {
	sets := make([]string, 0, 4)
	args := []any{id, userID}

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
	if patch.SortOrder != nil {
		args = append(args, *patch.SortOrder)
		sets = append(sets, "sort_order = $"+itoa(len(args)))
	}
	if len(sets) == 0 {
		return r.GetOwned(ctx, userID, id)
	}

	query := `UPDATE participant_links SET ` + join(sets) +
		` WHERE id = $1 AND user_id = $2 RETURNING ` + personalColumns
	return scanPersonal(r.db.Q(ctx).QueryRow(ctx, query, args...))
}

func (r *PersonalLinks) Delete(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM participant_links WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *PersonalLinks) NextSortOrder(ctx context.Context, userID, eventID uuid.UUID) (int, error) {
	var next int
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT coalesce(max(sort_order) + 1, 0) FROM participant_links
		WHERE user_id = $1 AND event_id = $2`, userID, eventID).Scan(&next)
	return next, mapError(err)
}

func (r *PersonalLinks) CountByEvent(ctx context.Context, userID, eventID uuid.UUID) (int, error) {
	var total int
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM participant_links WHERE user_id = $1 AND event_id = $2`,
		userID, eventID).Scan(&total)
	return total, mapError(err)
}
