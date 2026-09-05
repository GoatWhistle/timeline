package participation

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Rules struct{ db *postgres.DB }

func NewRules(db *postgres.DB) *Rules { return &Rules{db: db} }

const RuleColumns = `id, display_id, registration_id,
	(SELECT rg.display_id FROM registrations rg WHERE rg.id = registration_id),
	offset_minutes, enabled, slot_no,
	created_at, updated_at`

func ScanRule(row pgx.Row) (*models.NotificationRule, error) {
	var r models.NotificationRule
	err := row.Scan(&r.ID, &r.DisplayID, &r.RegistrationID, &r.RegistrationDisplayID,
		&r.OffsetMinutes, &r.Enabled, &r.SlotNo,
		&r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &r, nil
}

func (r *Rules) Create(ctx context.Context, rule *models.NotificationRule) (*models.NotificationRule, error) {
	return ScanRule(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO notification_rules (registration_id, offset_minutes, enabled, slot_no)
		VALUES ($1, $2, $3, $4)
		RETURNING `+RuleColumns,
		rule.RegistrationID, rule.OffsetMinutes, rule.Enabled, rule.SlotNo))
}

func (r *Rules) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM notification_rules WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("notification rule not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Rules) GetByID(ctx context.Context, id uuid.UUID) (*models.NotificationRule, error) {
	return ScanRule(r.db.Q(ctx).QueryRow(ctx, `SELECT `+RuleColumns+` FROM notification_rules WHERE id = $1`, id))
}

func (r *Rules) Update(ctx context.Context, id uuid.UUID, offset *int, enabled *bool,
) (*models.NotificationRule, error) {
	return ScanRule(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE notification_rules SET
			offset_minutes = COALESCE($2, offset_minutes),
			enabled = COALESCE($3, enabled)
		WHERE id = $1
		RETURNING `+RuleColumns, id, offset, enabled))
}

func (r *Rules) Disable(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `UPDATE notification_rules SET enabled = false WHERE id = $1`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Rules) ListByRegistration(ctx context.Context, registrationID uuid.UUID) ([]models.NotificationRule, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+RuleColumns+` FROM notification_rules WHERE registration_id = $1 ORDER BY slot_no`, registrationID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.NotificationRule, 0, 10)
	for rows.Next() {
		var rule models.NotificationRule
		if err := rows.Scan(&rule.ID, &rule.DisplayID, &rule.RegistrationID, &rule.RegistrationDisplayID,
			&rule.OffsetMinutes, &rule.Enabled,
			&rule.SlotNo, &rule.CreatedAt, &rule.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, rule)
	}
	return items, mapError(rows.Err())
}

func (r *Rules) NextFreeSlot(ctx context.Context, registrationID uuid.UUID, maxSlots int) (int, error) {
	var slot *int
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT min(candidate) FROM generate_series(1, $2) AS candidate
		WHERE candidate NOT IN (SELECT slot_no FROM notification_rules WHERE registration_id = $1)`,
		registrationID, maxSlots).Scan(&slot)
	if err != nil {
		return 0, mapError(err)
	}
	if slot == nil {
		return 0, models.NewConflict("rule_limit_reached",
			"a registration accepts at most "+itoa(maxSlots)+" rules")
	}
	return *slot, nil
}
