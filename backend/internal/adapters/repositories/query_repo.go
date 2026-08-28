package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type QueryRepository struct{ db *DB }

func NewQueryRepository(db *DB) *QueryRepository { return &QueryRepository{db: db} }

func (r *QueryRepository) MyEvents(ctx context.Context, userID uuid.UUID, filter models.MyEventFilter,
	page models.Page, now time.Time) ([]models.MyEventItem, int64, error) {
	conds := []string{
		"p.user_id = $1",
		"p.participation_status = 'ASSIGNED'",
		"h.published_at IS NOT NULL",
	}
	args := []any{userID}
	if !filter.IncludeArchived {
		conds = append(conds, "h.archived_at IS NULL")
	}
	if len(filter.States) > 0 {
		args = append(args, now)
		nowArg := "$" + itoa(len(args))
		stateConds := make([]string, 0, len(filter.States))
		for _, st := range filter.States {
			switch st {
			case models.EventArchived:
				stateConds = append(stateConds, `h.archived_at IS NOT NULL`)
			case models.EventUpcoming:
				stateConds = append(stateConds, `(h.archived_at IS NULL AND h.start_at > `+nowArg+`)`)
			case models.EventActive:
				stateConds = append(stateConds, `(h.archived_at IS NULL AND h.start_at <= `+nowArg+` AND h.end_at >= `+nowArg+`)`)
			case models.EventFinished:
				stateConds = append(stateConds, `(h.archived_at IS NULL AND h.end_at < `+nowArg+`)`)
			}
		}
		if len(stateConds) > 0 {
			conds = append(conds, "("+strings.Join(stateConds, " OR ")+")")
		}
	}
	where := "WHERE " + strings.Join(conds, " AND ")

	from := `
		FROM event_participants p
		JOIN events h ON h.id = p.event_id
		LEFT JOIN registrations r ON r.event_id = h.id
		LEFT JOIN registration_statuses s ON s.participant_id = p.id `

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) `+from+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT h.id, h.title, h.organizer, h.start_at, h.end_at, h.archived_at,
		       p.team_role,
		       r.url, r.deadline_at, r.state,
		       s.id, s.status, s.todo_cycle, s.registered_at `+from+where+`
		ORDER BY h.start_at DESC
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.MyEventItem, 0, page.Limit())
	ids := make([]uuid.UUID, 0, page.Limit())
	for rows.Next() {
		var (
			item        models.MyEventItem
			archivedAt  *time.Time
			regURL      *string
			regDeadline *time.Time
			regState    *models.RegistrationState
			statusID    *uuid.UUID
			statusValue *models.RegistrationStatusValue
			todoCycle   *int
			registered  *time.Time
		)
		if err := rows.Scan(&item.ID, &item.Title, &item.Organizer, &item.StartAt, &item.EndAt, &archivedAt,
			&item.TeamRole, &regURL, &regDeadline, &regState,
			&statusID, &statusValue, &todoCycle, &registered); err != nil {
			return nil, 0, mapError(err)
		}
		item.State = computeState(archivedAt, item.StartAt, item.EndAt, now)
		if regState != nil && *regState == models.RegistrationActive {
			item.RegistrationURL = regURL
			item.RegistrationDeadline = regDeadline
		}
		if statusID != nil && statusValue != nil && todoCycle != nil {
			item.RegistrationStatus = &models.RegistrationStatusShort{
				ID: *statusID, Status: *statusValue, TodoCycle: *todoCycle, RegisteredAt: registered,
			}
		}
		items = append(items, item)
		ids = append(ids, item.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, mapError(err)
	}

	next, err := r.nextStages(ctx, ids, now)
	if err != nil {
		return nil, 0, err
	}
	for i := range items {
		if stage, ok := next[items[i].ID]; ok {
			s := stage
			items[i].NextStage = &s
		}
	}
	return items, total, nil
}

func computeState(archivedAt *time.Time, start, end, now time.Time) models.EventState {
	switch {
	case archivedAt != nil:
		return models.EventArchived
	case now.Before(start):
		return models.EventUpcoming
	case now.After(end):
		return models.EventFinished
	default:
		return models.EventActive
	}
}

func (r *QueryRepository) nextStages(ctx context.Context, eventIDs []uuid.UUID, now time.Time) (map[uuid.UUID]models.StageShort, error) {
	result := make(map[uuid.UUID]models.StageShort, len(eventIDs))
	if len(eventIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT DISTINCT ON (event_id) event_id, id, name, type, start_at, end_at
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
			stage   models.StageShort
		)
		if err := rows.Scan(&eventID, &stage.ID, &stage.Name, &stage.Type, &stage.StartAt, &stage.EndAt); err != nil {
			return nil, mapError(err)
		}
		result[eventID] = stage
	}
	return result, mapError(rows.Err())
}

func (r *QueryRepository) NextStage(ctx context.Context, eventID uuid.UUID, now time.Time) (*models.StageShort, error) {
	stages, err := r.nextStages(ctx, []uuid.UUID{eventID}, now)
	if err != nil {
		return nil, err
	}
	if stage, ok := stages[eventID]; ok {
		return &stage, nil
	}
	return nil, nil
}

func (r *QueryRepository) Deadlines(ctx context.Context, overdue bool, within time.Duration,
	page models.Page, now time.Time) ([]models.DeadlineItem, int64, error) {
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
		SELECT h.id, h.title, p.id, u.id, u.display_name, u.email, u.is_active,
		       r.deadline_at, s.status `+from+`
		ORDER BY r.deadline_at
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.DeadlineItem, 0, page.Limit())
	for rows.Next() {
		var item models.DeadlineItem
		if err := rows.Scan(&item.EventID, &item.EventTitle, &item.ParticipantID,
			&item.User.ID, &item.User.DisplayName, &item.User.Email, &item.User.IsActive,
			&item.DeadlineAt, &item.Status); err != nil {
			return nil, 0, mapError(err)
		}
		if now.After(item.DeadlineAt) {
			item.OverdueMinutes = int(now.Sub(item.DeadlineAt).Minutes())
		}
		items = append(items, item)
	}
	return items, total, mapError(rows.Err())
}
