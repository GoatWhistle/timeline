package audit

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Audit struct{ db *postgres.DB }

func NewAudit(db *postgres.DB) *Audit { return &Audit{db: db} }

func (r *Audit) Insert(ctx context.Context, entry *models.AuditLog) error {
	before, err := marshalOrNil(entry.BeforeJSON)
	if err != nil {
		return err
	}
	after, err := marshalOrNil(entry.AfterJSON)
	if err != nil {
		return err
	}
	_, err = r.db.Q(ctx).Exec(ctx, `
		INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, before_json, after_json, request_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		entry.ActorUserID, entry.Action, entry.EntityType, entry.EntityID, before, after, entry.RequestID)
	return mapError(err)
}

func marshalOrNil(value any) ([]byte, error) {
	if value == nil {
		return nil, nil
	}
	return json.Marshal(value)
}

func (r *Audit) List(ctx context.Context, filter models.AuditFilter, page models.Page,
) ([]dto.AuditResponse, int64, error) {
	conds := make([]string, 0, 6)
	args := make([]any, 0, 6)

	if filter.ActorUserID != nil {
		args = append(args, *filter.ActorUserID)
		conds = append(conds, `a.actor_user_id = $`+itoa(len(args)))
	}
	if filter.Action != "" {
		args = append(args, filter.Action)
		conds = append(conds, `a.action = $`+itoa(len(args)))
	}
	if filter.EntityType != "" {
		args = append(args, filter.EntityType)
		conds = append(conds, `a.entity_type = $`+itoa(len(args)))
	}
	if filter.EntityID != nil {
		args = append(args, *filter.EntityID)
		conds = append(conds, `a.entity_id = $`+itoa(len(args)))
	}
	if filter.From != nil {
		args = append(args, *filter.From)
		conds = append(conds, `a.created_at >= $`+itoa(len(args)))
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		conds = append(conds, `a.created_at <= $`+itoa(len(args)))
	}
	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) FROM audit_log a `+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT a.id, a.actor_user_id, u.email, a.action, a.entity_type, a.entity_id,
		       a.before_json, a.after_json, a.request_id, a.created_at
		FROM audit_log a
		LEFT JOIN users u ON u.id = a.actor_user_id
		`+where+`
		ORDER BY a.created_at DESC
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.AuditResponse, 0, page.Limit())
	for rows.Next() {
		var (
			item   dto.AuditResponse
			before []byte
			after  []byte
		)
		if err := rows.Scan(&item.ID, &item.ActorUserID, &item.ActorEmail, &item.Action, &item.EntityType,
			&item.EntityID, &before, &after, &item.RequestID, &item.CreatedAt); err != nil {
			return nil, 0, mapError(err)
		}
		if len(before) > 0 {
			if err := json.Unmarshal(before, &item.Before); err != nil {
				return nil, 0, err
			}
		}
		if len(after) > 0 {
			if err := json.Unmarshal(after, &item.After); err != nil {
				return nil, 0, err
			}
		}
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}

func (r *Audit) DeleteOlderThan(ctx context.Context, retentionDays int) (int64, error) {
	if !postgres.InTx(ctx) {
		return 0, models.NewValidation("audit cleanup runs only inside a transaction")
	}
	if _, err := r.db.Q(ctx).Exec(ctx, `SET LOCAL app.audit_retention = 'on'`); err != nil {
		return 0, mapError(err)
	}
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM audit_log WHERE created_at < now() - make_interval(days => $1)`, retentionDays)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}
