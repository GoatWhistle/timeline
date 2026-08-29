package systemevent

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

const audienceFilter = `(audience_kind = 'USER' AND audience_user_id = $1
	OR audience_kind = 'ADMIN' AND $2)`

func (r *Events) List(ctx context.Context, userID uuid.UUID, isAdmin bool,
	unreadOnly bool, page models.Page) ([]models.SystemEventResponse, int64, error) {
	var total int64
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(*) FROM system_events e
		WHERE `+audienceFilter+`
		  AND (NOT $3 OR NOT EXISTS (
			SELECT 1 FROM system_event_reads sr WHERE sr.event_id = e.id AND sr.user_id = $1))`,
		userID, isAdmin, unreadOnly).Scan(&total)
	if err != nil {
		return nil, 0, mapError(err)
	}
	if total == 0 {
		return []models.SystemEventResponse{}, 0, nil
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT e.id, e.event_type, e.severity, e.subject_type, e.subject_id, e.payload_json,
		       EXISTS (SELECT 1 FROM system_event_reads sr
		               WHERE sr.event_id = e.id AND sr.user_id = $1) AS read,
		       e.created_at
		FROM system_events e
		WHERE `+audienceFilter+`
		  AND (NOT $3 OR NOT EXISTS (
			SELECT 1 FROM system_event_reads sr WHERE sr.event_id = e.id AND sr.user_id = $1))
		ORDER BY e.created_at DESC, e.id DESC
		LIMIT $4 OFFSET $5`,
		userID, isAdmin, unreadOnly, page.Size, page.Offset())
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.SystemEventResponse, 0, page.Size)
	for rows.Next() {
		var item models.SystemEventResponse
		var raw []byte
		if err := rows.Scan(&item.ID, &item.Type, &item.Severity, &item.SubjectType,
			&item.SubjectID, &raw, &item.Read, &item.CreatedAt); err != nil {
			return nil, 0, mapError(err)
		}
		if len(raw) > 0 {
			if err := json.Unmarshal(raw, &item.Payload); err != nil {
				return nil, 0, err
			}
		}
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}

func (r *Events) UnreadCount(ctx context.Context, userID uuid.UUID, isAdmin bool) (int64, error) {
	var count int64
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(*) FROM system_events e
		WHERE `+audienceFilter+`
		  AND NOT EXISTS (SELECT 1 FROM system_event_reads sr
		                  WHERE sr.event_id = e.id AND sr.user_id = $1)`,
		userID, isAdmin).Scan(&count)
	return count, mapError(err)
}

func (r *Events) MarkRead(ctx context.Context, userID uuid.UUID, isAdmin bool,
	ids []uuid.UUID) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		INSERT INTO system_event_reads (event_id, user_id)
		SELECT e.id, $1 FROM system_events e
		WHERE e.id = ANY($3) AND `+audienceFilter+`
		ON CONFLICT DO NOTHING`, userID, isAdmin, ids)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

func (r *Events) MarkAllRead(ctx context.Context, userID uuid.UUID, isAdmin bool) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		INSERT INTO system_event_reads (event_id, user_id)
		SELECT e.id, $1 FROM system_events e
		WHERE `+audienceFilter+`
		ON CONFLICT DO NOTHING`, userID, isAdmin)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

func (r *Events) Visible(ctx context.Context, id uuid.UUID, userID uuid.UUID, isAdmin bool) (bool, error) {
	var exists bool
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT EXISTS (SELECT 1 FROM system_events e
		               WHERE e.id = $3 AND `+audienceFilter+`)`,
		userID, isAdmin, id).Scan(&exists)
	return exists, mapError(err)
}

func (r *Events) DeleteOlderThan(ctx context.Context, before time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM system_events WHERE created_at < $1`, before)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}
