package audit

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

var auditSortColumns = map[models.AuditSortField]string{
	models.AuditSortCreatedAt:  "a.created_at",
	models.AuditSortActor:      "lower(u.email)",
	models.AuditSortAction:     "a.action",
	models.AuditSortEntityType: "a.entity_type",
}

func auditOrderSQL(sort models.AuditSort) string {
	column, ok := auditSortColumns[sort.Field]
	if !ok {
		column = auditSortColumns[models.DefaultAuditSort.Field]
		sort.Field = models.DefaultAuditSort.Field
	}
	direction := "DESC"
	if sort.Direction == models.CatalogSortAsc {
		direction = "ASC"
	}
	switch sort.Field {
	case models.AuditSortCreatedAt:
		return column + " " + direction + ", a.id " + direction
	case models.AuditSortActor:
		return column + " " + direction + " NULLS LAST, a.created_at DESC, a.id DESC"
	default:
		return column + " " + direction + ", a.created_at DESC, a.id DESC"
	}
}

func auditFilterSQL(filter models.AuditFilter) (string, []any) {
	conds := make([]string, 0, 7)
	args := make([]any, 0, 7)
	add := func(cond string, value any) {
		args = append(args, value)
		conds = append(conds, strings.ReplaceAll(cond, "$?", "$"+itoa(len(args))))
	}

	if filter.ActorDisplayID != "" {
		add(`u.display_id = $?`, filter.ActorDisplayID)
	}
	if filter.Action != "" {
		add(`a.action = $?`, filter.Action)
	}
	if filter.EntityType != "" {
		add(`a.entity_type = $?`, filter.EntityType)
	}
	if filter.EntityID != nil {
		add(`a.entity_id = $?`, *filter.EntityID)
	}
	if filter.From != nil {
		add(`a.created_at >= $?`, *filter.From)
	}
	if filter.To != nil {
		add(`a.created_at <= $?`, *filter.To)
	}
	if search := strings.TrimSpace(filter.Search); search != "" {
		add(`(lower(coalesce(u.email, '')) LIKE $? OR lower(a.action) LIKE $?`+
			` OR lower(a.entity_type) LIKE $?)`, postgres.LikeContains(search))
	}
	if len(conds) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(conds, " AND "), args
}

func (r *Audit) List(ctx context.Context, filter models.AuditFilter, page models.Page,
) ([]dto.AuditResponse, int64, error) {
	where, args := auditFilterSQL(filter)

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(*) FROM audit_log a
		LEFT JOIN users u ON u.id = a.actor_user_id
		`+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT a.id, u.display_id, u.email, a.action, a.entity_type, a.entity_id,
		       a.before_json, a.after_json, a.request_id, a.created_at
		FROM audit_log a
		LEFT JOIN users u ON u.id = a.actor_user_id
		`+where+`
		ORDER BY `+auditOrderSQL(filter.Sort)+`
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
