package personal

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Outcomes struct{ db *postgres.DB }

func NewOutcomes(db *postgres.DB) *Outcomes { return &Outcomes{db: db} }

const outcomeColumns = `event_id,
	(SELECT e.display_id FROM events e WHERE e.id = event_id),
	outcome, place, prize, track, note, created_at, updated_at`

func scanOutcome(row pgx.Row) (*models.ParticipantOutcome, error) {
	var o models.ParticipantOutcome
	err := row.Scan(&o.EventID, &o.EventDisplayID, &o.Outcome, &o.Place, &o.Prize, &o.Track,
		&o.Note, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &o, nil
}

func (r *Outcomes) Get(ctx context.Context, userID, eventID uuid.UUID) (*models.ParticipantOutcome, error) {
	return scanOutcome(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+outcomeColumns+` FROM participant_outcomes WHERE user_id = $1 AND event_id = $2`,
		userID, eventID))
}

func (r *Outcomes) Save(ctx context.Context, userID, eventID uuid.UUID,
	outcome models.Outcome, place *int, prize, track, note *string) (*models.ParticipantOutcome, error) {
	return scanOutcome(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO participant_outcomes (user_id, event_id, outcome, place, prize, track, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id, event_id) DO UPDATE SET
			outcome = EXCLUDED.outcome,
			place = EXCLUDED.place,
			prize = EXCLUDED.prize,
			track = EXCLUDED.track,
			note = EXCLUDED.note
		RETURNING `+outcomeColumns, userID, eventID, outcome, place, prize, track, note))
}

func (r *Outcomes) Delete(ctx context.Context, userID, eventID uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM participant_outcomes WHERE user_id = $1 AND event_id = $2`, userID, eventID)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Outcomes) ListByEvents(ctx context.Context, userID uuid.UUID,
	eventIDs []uuid.UUID) (map[uuid.UUID]models.ParticipantOutcome, error) {
	result := make(map[uuid.UUID]models.ParticipantOutcome, len(eventIDs))
	if len(eventIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT `+outcomeColumns+` FROM participant_outcomes
		WHERE user_id = $1 AND event_id = ANY($2)`, userID, eventIDs)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var o models.ParticipantOutcome
		if err := rows.Scan(&o.EventID, &o.EventDisplayID, &o.Outcome, &o.Place, &o.Prize, &o.Track,
			&o.Note, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		result[o.EventID] = o
	}
	return result, mapError(rows.Err())
}
