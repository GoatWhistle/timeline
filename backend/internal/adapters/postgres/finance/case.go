package finance

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Cases struct{ db *postgres.DB }

func NewCases(db *postgres.DB) *Cases { return &Cases{db: db} }

var mapError = postgres.MapError

const caseColumns = `id, display_id, event_id, track_id, case_no, name, description, partner,
	CASE WHEN prize_amount IS NULL THEN NULL ELSE trunc(prize_amount)::bigint::text END,
	created_at, updated_at`

func scanCase(row pgx.Row) (*models.EventCase, error) {
	var c models.EventCase
	err := row.Scan(&c.ID, &c.DisplayID, &c.EventID, &c.TrackID, &c.CaseNo, &c.Name,
		&c.Description, &c.Partner, &c.PrizeAmount, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &c, nil
}

func (r *Cases) Create(ctx context.Context, c *models.EventCase) (*models.EventCase, error) {
	return scanCase(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO event_cases (event_id, track_id, case_no, name, description, partner, prize_amount)
		VALUES ($1, $2, $3, $4, $5, $6, $7::numeric)
		RETURNING `+caseColumns,
		c.EventID, c.TrackID, c.CaseNo, c.Name, c.Description, c.Partner, c.PrizeAmount))
}

func (r *Cases) Update(ctx context.Context, id uuid.UUID, patch models.EventCasePatch) (*models.EventCase, error) {
	return scanCase(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE event_cases SET
			name = COALESCE($2, name),
			description = COALESCE($3, description),
			partner = COALESCE($4, partner),
			prize_amount = CASE WHEN $5::boolean THEN NULL
				ELSE COALESCE($6::numeric, prize_amount) END,
			track_id = CASE WHEN $7::boolean THEN NULL
				ELSE COALESCE($8::uuid, track_id) END,
			case_no = COALESCE($9, case_no)
		WHERE id = $1
		RETURNING `+caseColumns,
		id, patch.Name, patch.Description, patch.Partner, patch.ClearPrize, patch.PrizeAmount,
		patch.ClearTrack, patch.TrackID, patch.CaseNo))
}

func (r *Cases) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `DELETE FROM event_cases WHERE id = $1`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Cases) GetByID(ctx context.Context, id uuid.UUID) (*models.EventCase, error) {
	return scanCase(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+caseColumns+` FROM event_cases WHERE id = $1`, id))
}

func (r *Cases) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM event_cases WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("event case not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Cases) NextCaseNo(ctx context.Context, eventID uuid.UUID) (int, error) {
	var next int
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT COALESCE(MAX(case_no), 0) + 1 FROM event_cases WHERE event_id = $1`,
		eventID).Scan(&next)
	if err != nil {
		return 0, mapError(err)
	}
	return next, nil
}

func (r *Cases) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]models.EventCase, error) {
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT `+caseColumns+` FROM event_cases WHERE event_id = $1 ORDER BY case_no`, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	out := make([]models.EventCase, 0, 8)
	for rows.Next() {
		var c models.EventCase
		if err := rows.Scan(&c.ID, &c.DisplayID, &c.EventID, &c.TrackID, &c.CaseNo, &c.Name,
			&c.Description, &c.Partner, &c.PrizeAmount, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		out = append(out, c)
	}
	return out, mapError(rows.Err())
}

func (r *Cases) PrizeTotal(ctx context.Context, eventID uuid.UUID,
	excludeCase *uuid.UUID) (string, error) {
	var total string
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT trunc(COALESCE(SUM(prize_amount), 0))::bigint::text FROM event_cases
		WHERE event_id = $1 AND ($2::uuid IS NULL OR id <> $2)`,
		eventID, excludeCase).Scan(&total)
	if err != nil {
		return "", mapError(err)
	}
	return total, nil
}
