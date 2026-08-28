package personal

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type History struct{ db *postgres.DB }

func NewHistory(db *postgres.DB) *History { return &History{db: db} }

const historyFrom = `FROM events e
	JOIN event_participants p ON p.event_id = e.id AND p.user_id = $1
	WHERE p.participation_status = 'ASSIGNED' AND e.archived_at IS NULL`

func (r *History) List(ctx context.Context, userID uuid.UUID,
	page models.Page) ([]models.HistoryItem, int64, error) {
	args := []any{userID}

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) `+historyFrom, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT e.id, e.title, e.kind, e.start_at, e.end_at, p.team_role `+historyFrom+`
		ORDER BY e.start_at DESC
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.HistoryItem, 0, page.Limit())
	for rows.Next() {
		var item models.HistoryItem
		if err := rows.Scan(&item.EventID, &item.Title, &item.Kind,
			&item.StartAt, &item.EndAt, &item.TeamRole); err != nil {
			return nil, 0, mapError(err)
		}
		item.Joined = true
		item.Artifacts = []models.ParticipantArtifact{}
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}

func (r *History) TaskCounts(ctx context.Context, userID uuid.UUID,
	eventIDs []uuid.UUID) (map[uuid.UUID][2]int, error) {
	counts := make(map[uuid.UUID][2]int, len(eventIDs))
	if len(eventIDs) == 0 {
		return counts, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT event_id, count(*), count(done_at)
		FROM participant_tasks
		WHERE user_id = $1 AND event_id = ANY($2)
		GROUP BY event_id`, userID, eventIDs)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			id          uuid.UUID
			total, done int
		)
		if err := rows.Scan(&id, &total, &done); err != nil {
			return nil, mapError(err)
		}
		counts[id] = [2]int{total, done}
	}
	return counts, mapError(rows.Err())
}
