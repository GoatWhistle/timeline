package audit

import (
	"context"
	"encoding/json"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
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
