package identity

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type ProfileLinks struct{ db *postgres.DB }

func NewProfileLinks(db *postgres.DB) *ProfileLinks { return &ProfileLinks{db: db} }

const profileLinkColumns = `id, url, label, sort_order, created_at, updated_at`

func scanProfileLink(row pgx.Row) (*models.ProfileLink, error) {
	var l models.ProfileLink
	err := row.Scan(&l.ID, &l.URL, &l.Label, &l.SortOrder, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &l, nil
}

func (r *ProfileLinks) ListByUser(ctx context.Context, userID uuid.UUID) ([]models.ProfileLink, error) {
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT `+profileLinkColumns+` FROM profile_links
		 WHERE user_id = $1 ORDER BY sort_order, created_at`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.ProfileLink, 0, models.ProfileLinkMaxPerUser)
	for rows.Next() {
		var l models.ProfileLink
		if err := rows.Scan(&l.ID, &l.URL, &l.Label, &l.SortOrder,
			&l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, l)
	}
	return items, mapError(rows.Err())
}

func (r *ProfileLinks) CountByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM profile_links WHERE user_id = $1`, userID).Scan(&count)
	if err != nil {
		return 0, mapError(err)
	}
	return count, nil
}

func (r *ProfileLinks) Create(ctx context.Context, userID uuid.UUID,
	url string, label *string) (*models.ProfileLink, error) {
	return scanProfileLink(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO profile_links (user_id, url, label, sort_order)
		VALUES ($1, $2, $3,
			COALESCE((SELECT max(sort_order) + 1 FROM profile_links WHERE user_id = $1), 0))
		RETURNING `+profileLinkColumns, userID, url, label))
}

func (r *ProfileLinks) GetOwned(ctx context.Context, userID, id uuid.UUID) (*models.ProfileLink, error) {
	return scanProfileLink(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+profileLinkColumns+` FROM profile_links WHERE id = $1 AND user_id = $2`,
		id, userID))
}

func (r *ProfileLinks) Update(ctx context.Context, userID, id uuid.UUID,
	patch models.ProfileLinkPatch) (*models.ProfileLink, error) {
	if patch.URL == nil && !patch.LabelSet {
		return r.GetOwned(ctx, userID, id)
	}
	return scanProfileLink(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE profile_links SET
			url = COALESCE($3, url),
			label = CASE WHEN $4 THEN $5 ELSE label END
		WHERE id = $1 AND user_id = $2
		RETURNING `+profileLinkColumns,
		id, userID, patch.URL, patch.LabelSet, patch.Label))
}

func (r *ProfileLinks) Delete(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM profile_links WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *ProfileLinks) Reorder(ctx context.Context, userID uuid.UUID, ids []uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE profile_links AS l SET sort_order = ordered.position
		FROM (SELECT id, ordinality - 1 AS position
		      FROM unnest($2::uuid[]) WITH ORDINALITY AS t(id, ordinality)) AS ordered
		WHERE l.id = ordered.id AND l.user_id = $1`, userID, ids)
	if err != nil {
		return mapError(err)
	}
	if int(tag.RowsAffected()) != len(ids) {
		return models.ErrNotFound
	}
	return nil
}
