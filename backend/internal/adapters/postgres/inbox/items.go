package inbox

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Items struct{ db *postgres.DB }

func NewItems(db *postgres.DB) *Items { return &Items{db: db} }

const itemColumns = `id, display_id, recipient_user_id, kind, title, body_md,
	subject_type, subject_id, actions_json, logical_key, read_at, deleted_at, created_at, updated_at`

func scanItem(row pgx.Row) (*models.InboxItem, error) {
	var it models.InboxItem
	var raw []byte
	err := row.Scan(&it.ID, &it.DisplayID, &it.RecipientUserID, &it.Kind, &it.Title, &it.BodyMD,
		&it.SubjectType, &it.SubjectID, &raw, &it.LogicalKey, &it.ReadAt, &it.DeletedAt,
		&it.CreatedAt, &it.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &it.Actions); err != nil {
			return nil, err
		}
	}
	return &it, nil
}

func (r *Items) Insert(ctx context.Context, it *models.InboxItem) (*models.InboxItem, bool, error) {
	actions, err := json.Marshal(actionsOrEmpty(it.Actions))
	if err != nil {
		return nil, false, err
	}
	row := r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO inbox_items
			(recipient_user_id, kind, title, body_md, subject_type, subject_id, actions_json, logical_key)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (recipient_user_id, logical_key) DO NOTHING
		RETURNING `+itemColumns,
		it.RecipientUserID, it.Kind, it.Title, it.BodyMD, it.SubjectType, it.SubjectID, actions, it.LogicalKey)

	stored, err := scanItem(row)
	if err != nil {
		if isNotFound(err) {
			return nil, false, nil
		}
		return nil, false, err
	}
	return stored, true, nil
}

func actionsOrEmpty(a []models.InboxAction) []models.InboxAction {
	if a == nil {
		return []models.InboxAction{}
	}
	return a
}

func (r *Items) GetByID(ctx context.Context, id uuid.UUID) (*models.InboxItem, error) {
	return scanItem(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+itemColumns+` FROM inbox_items WHERE id = $1`, id))
}

func (r *Items) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM inbox_items WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if isNotFound(mapError(err)) {
			return uuid.Nil, models.NewNotFound("inbox item not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Items) List(ctx context.Context, userID uuid.UUID, unreadOnly bool,
	page models.Page) ([]models.InboxItem, int64, error) {
	var total int64
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(*) FROM inbox_items
		WHERE recipient_user_id = $1 AND deleted_at IS NULL AND (NOT $2 OR read_at IS NULL)`,
		userID, unreadOnly).Scan(&total)
	if err != nil {
		return nil, 0, mapError(err)
	}
	if total == 0 {
		return []models.InboxItem{}, 0, nil
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+itemColumns+` FROM inbox_items
		WHERE recipient_user_id = $1 AND deleted_at IS NULL AND (NOT $2 OR read_at IS NULL)
		ORDER BY created_at DESC, id DESC
		LIMIT $3 OFFSET $4`,
		userID, unreadOnly, page.Size, page.Offset())
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.InboxItem, 0, page.Size)
	for rows.Next() {
		item, err := scanItem(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, *item)
	}
	return items, total, mapError(rows.Err())
}

func (r *Items) UnreadCount(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(*) FROM inbox_items
		WHERE recipient_user_id = $1 AND deleted_at IS NULL AND read_at IS NULL`,
		userID).Scan(&count)
	return count, mapError(err)
}

func (r *Items) MarkRead(ctx context.Context, userID uuid.UUID, ids []uuid.UUID, at time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE inbox_items SET read_at = $3
		WHERE recipient_user_id = $1 AND deleted_at IS NULL AND read_at IS NULL AND id = ANY($2)`,
		userID, ids, at)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

func (r *Items) MarkAllRead(ctx context.Context, userID uuid.UUID, at time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE inbox_items SET read_at = $2
		WHERE recipient_user_id = $1 AND deleted_at IS NULL AND read_at IS NULL`,
		userID, at)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

func (r *Items) SoftDelete(ctx context.Context, userID uuid.UUID, ids []uuid.UUID, at time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE inbox_items SET deleted_at = $3
		WHERE recipient_user_id = $1 AND deleted_at IS NULL AND id = ANY($2)`,
		userID, ids, at)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

func (r *Items) SoftDeleteAll(ctx context.Context, userID uuid.UUID, readOnly bool, at time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE inbox_items SET deleted_at = $2
		WHERE recipient_user_id = $1 AND deleted_at IS NULL AND (NOT $3 OR read_at IS NOT NULL)`,
		userID, at, readOnly)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

func (r *Items) Restore(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*models.InboxItem, error) {
	row := r.db.Q(ctx).QueryRow(ctx, `
		UPDATE inbox_items SET deleted_at = NULL
		WHERE id = $1 AND recipient_user_id = $2 AND deleted_at IS NOT NULL
		RETURNING `+itemColumns,
		id, userID)
	return scanItem(row)
}

func (r *Items) PurgeDeletedBefore(ctx context.Context, before time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM inbox_items WHERE deleted_at IS NOT NULL AND deleted_at < $1`, before)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}
