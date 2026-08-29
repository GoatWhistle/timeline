package personal

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Retrospectives struct{ db *postgres.DB }

func NewRetrospectives(db *postgres.DB) *Retrospectives { return &Retrospectives{db: db} }

const retrospectiveColumns = `event_id,
	(SELECT e.display_id FROM events e WHERE e.id = event_id),
	went_well, went_badly, next_time, created_at, updated_at`

func (r *Retrospectives) Get(ctx context.Context, userID, eventID uuid.UUID) (*models.ParticipantRetrospective, error) {
	var item models.ParticipantRetrospective
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT `+retrospectiveColumns+` FROM participant_retrospectives
		WHERE user_id = $1 AND event_id = $2`, userID, eventID).
		Scan(&item.EventID, &item.EventDisplayID, &item.WentWell, &item.WentBadly, &item.NextTime,
			&item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &item, nil
}

func (r *Retrospectives) Save(ctx context.Context, userID, eventID uuid.UUID,
	wentWell, wentBadly, nextTime *string) (*models.ParticipantRetrospective, error) {
	var item models.ParticipantRetrospective
	err := r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO participant_retrospectives (user_id, event_id, went_well, went_badly, next_time)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, event_id) DO UPDATE SET
			went_well = EXCLUDED.went_well,
			went_badly = EXCLUDED.went_badly,
			next_time = EXCLUDED.next_time
		RETURNING `+retrospectiveColumns,
		userID, eventID, wentWell, wentBadly, nextTime).
		Scan(&item.EventID, &item.EventDisplayID, &item.WentWell, &item.WentBadly, &item.NextTime,
			&item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &item, nil
}

func (r *Retrospectives) Delete(ctx context.Context, userID, eventID uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM participant_retrospectives WHERE user_id = $1 AND event_id = $2`,
		userID, eventID)
	return mapError(err)
}

func (r *Retrospectives) Empty(eventID uuid.UUID) *models.ParticipantRetrospective {
	return &models.ParticipantRetrospective{EventID: eventID}
}
