package systemevent

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Events struct{ db *postgres.DB }

func NewEvents(db *postgres.DB) *Events { return &Events{db: db} }

const eventColumns = `id, display_id, event_type, severity, audience_kind, audience_user_id,
	subject_type, subject_id, payload_json, dedup_key, created_at`

func scanEvent(row pgx.Row) (*models.SystemEvent, error) {
	var e models.SystemEvent
	var raw []byte
	err := row.Scan(&e.ID, &e.DisplayID, &e.Type, &e.Severity, &e.Audience, &e.UserID,
		&e.SubjectType, &e.SubjectID, &raw, &e.DedupKey, &e.CreatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &e.Payload); err != nil {
			return nil, err
		}
	}
	return &e, nil
}

func (r *Events) Insert(ctx context.Context, e *models.SystemEvent) (*models.SystemEvent, bool, error) {
	payload, err := json.Marshal(payloadOrEmpty(e.Payload))
	if err != nil {
		return nil, false, err
	}
	row := r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO system_events
			(event_type, severity, audience_kind, audience_user_id, subject_type, subject_id,
			 payload_json, dedup_key)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
		RETURNING `+eventColumns,
		e.Type, e.Severity, e.Audience, e.UserID, e.SubjectType, e.SubjectID, payload, e.DedupKey)

	stored, err := scanEvent(row)
	if err != nil {
		if isNotFound(err) {
			return nil, false, nil
		}
		return nil, false, err
	}
	return stored, true, nil
}

func (r *Events) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM system_events WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("system event not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Events) GetByID(ctx context.Context, id uuid.UUID) (*models.SystemEvent, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+eventColumns+` FROM system_events WHERE id = $1`, id))
}

func payloadOrEmpty(p map[string]any) map[string]any {
	if p == nil {
		return map[string]any{}
	}
	return p
}
