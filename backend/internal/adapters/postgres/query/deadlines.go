package query

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (r *Timeline) nextStages(ctx context.Context, eventIDs []uuid.UUID,
	now time.Time) (map[uuid.UUID]dto.StageShort, error) {
	result := make(map[uuid.UUID]dto.StageShort, len(eventIDs))
	if len(eventIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT DISTINCT ON (event_id) event_id, display_id, name, type, start_at, end_at
		FROM stages
		WHERE event_id = ANY($1) AND end_at >= $2
		ORDER BY event_id, start_at`, eventIDs, now)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			eventID uuid.UUID
			stage   dto.StageShort
		)
		if err := rows.Scan(&eventID, &stage.ID, &stage.Name, &stage.Type, &stage.StartAt, &stage.EndAt); err != nil {
			return nil, mapError(err)
		}
		result[eventID] = stage
	}
	return result, mapError(rows.Err())
}

func (r *Timeline) NextStage(ctx context.Context, eventID uuid.UUID, now time.Time) (*dto.StageShort, error) {
	stages, err := r.nextStages(ctx, []uuid.UUID{eventID}, now)
	if err != nil {
		return nil, err
	}
	if stage, ok := stages[eventID]; ok {
		return &stage, nil
	}
	return nil, nil
}

func (r *Timeline) Deadlines(ctx context.Context, overdue bool, within time.Duration,
	page models.Page, now time.Time) ([]dto.DeadlineItem, int64, error) {
	condition := "r.deadline_at > $1 AND r.deadline_at <= $2"
	args := []any{now, now.Add(within)}
	if overdue {
		condition = "r.deadline_at <= $1 AND h.end_at >= $1"
		args = []any{now}
	}

	from := `
		FROM registration_statuses s
		JOIN registrations r ON r.id = s.registration_id
		JOIN events h ON h.id = s.event_id
		JOIN event_participants p ON p.id = s.participant_id
		JOIN users u ON u.id = p.user_id
		WHERE s.status = 'TODO'
		  AND r.state = 'ACTIVE'
		  AND p.participation_status = 'ASSIGNED'
		  AND h.published_at IS NOT NULL
		  AND h.archived_at IS NULL
		  AND ` + condition

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) `+from, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT h.display_id, h.title, p.id, u.id, u.first_name, u.middle_name, u.last_name,
		       u.nickname, u.email, u.is_active,
		       r.deadline_at, s.status `+from+`
		ORDER BY r.deadline_at
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.DeadlineItem, 0, page.Limit())
	for rows.Next() {
		var item dto.DeadlineItem
		if err := rows.Scan(&item.EventID, &item.EventTitle, &item.ParticipantID,
			&item.User.ID, &item.User.FirstName, &item.User.MiddleName, &item.User.LastName,
			&item.User.Nickname, &item.User.Email, &item.User.IsActive,
			&item.DeadlineAt, &item.Status); err != nil {
			return nil, 0, mapError(err)
		}
		if now.After(item.DeadlineAt) {
			item.OverdueMinutes = int(now.Sub(item.DeadlineAt).Minutes())
		}
		item.User.Fill(locale.Default)
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}
