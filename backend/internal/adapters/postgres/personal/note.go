package personal

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Notes struct{ db *postgres.DB }

func NewNotes(db *postgres.DB) *Notes { return &Notes{db: db} }

func (r *Notes) Get(ctx context.Context, userID, eventID uuid.UUID) (*models.ParticipantNote, error) {
	var note models.ParticipantNote
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT event_id, (SELECT e.display_id FROM events e WHERE e.id = event_id), body, updated_at FROM participant_notes
		WHERE user_id = $1 AND event_id = $2`, userID, eventID).
		Scan(&note.EventID, &note.EventDisplayID, &note.Body, &note.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &note, nil
}

func (r *Notes) Save(ctx context.Context, userID, eventID uuid.UUID, body string) (*models.ParticipantNote, error) {
	var note models.ParticipantNote
	err := r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO participant_notes (user_id, event_id, body)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, event_id) DO UPDATE SET body = EXCLUDED.body
		RETURNING event_id, (SELECT e.display_id FROM events e WHERE e.id = event_id), body, updated_at`, userID, eventID, body).
		Scan(&note.EventID, &note.EventDisplayID, &note.Body, &note.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &note, nil
}

func (r *Notes) Delete(ctx context.Context, userID, eventID uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM participant_notes WHERE user_id = $1 AND event_id = $2`, userID, eventID)
	return mapError(err)
}

func (r *Notes) Empty(eventID uuid.UUID) *models.ParticipantNote {
	return &models.ParticipantNote{EventID: eventID, Body: ""}
}
