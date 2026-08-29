package personal

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Reminders struct{ db *postgres.DB }

func NewReminders(db *postgres.DB) *Reminders { return &Reminders{db: db} }

func (r *Reminders) DueTasks(ctx context.Context, from, until time.Time,
	after uuid.UUID, limit int) ([]models.DueTaskCandidate, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT t.id, t.user_id, t.event_id, t.title, t.due_at, e.title
		FROM participant_tasks t
		JOIN events e ON e.id = t.event_id
		JOIN users u ON u.id = t.user_id
		WHERE t.done_at IS NULL
		  AND t.due_at IS NOT NULL
		  AND t.due_at <= $1
		  AND t.due_at >= $2
		  AND e.archived_at IS NULL
		  AND u.is_active
		  AND u.deleted_at IS NULL
		  AND ($3::uuid IS NULL OR t.id > $3)
		ORDER BY t.id
		LIMIT $4`, until, from, postgres.NullUUID(after), limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.DueTaskCandidate, 0, limit)
	for rows.Next() {
		var c models.DueTaskCandidate
		if err := rows.Scan(&c.TaskID, &c.UserID, &c.EventID, &c.Title,
			&c.DueAt, &c.EventTitle); err != nil {
			return nil, mapError(err)
		}
		items = append(items, c)
	}
	return items, mapError(rows.Err())
}

func (r *Reminders) DueRetrospectives(ctx context.Context, from, until time.Time,
	afterEvent, afterUser uuid.UUID, limit int) ([]models.DueRetrospectiveCandidate, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT e.id, p.user_id, e.title, e.end_at
		FROM events e
		JOIN event_participants p ON p.event_id = e.id
		JOIN users u ON u.id = p.user_id
		LEFT JOIN participant_retrospectives r
			ON r.event_id = e.id AND r.user_id = p.user_id
		WHERE e.published_at IS NOT NULL
		  AND e.archived_at IS NULL
		  AND p.participation_status = 'ASSIGNED'
		  AND u.is_active
		  AND u.deleted_at IS NULL
		  AND r.user_id IS NULL
		  AND e.end_at <= $1
		  AND e.end_at >= $2
		  AND (($3::uuid IS NULL) OR (e.id, p.user_id) > ($3, $4))
		ORDER BY e.id, p.user_id
		LIMIT $5`, until, from, postgres.NullUUID(afterEvent), afterUser, limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.DueRetrospectiveCandidate, 0, limit)
	for rows.Next() {
		var c models.DueRetrospectiveCandidate
		if err := rows.Scan(&c.EventID, &c.UserID, &c.EventTitle, &c.EndAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, c)
	}
	return items, mapError(rows.Err())
}
