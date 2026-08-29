package query

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Timeline struct{ db *postgres.DB }

func NewTimeline(db *postgres.DB) *Timeline { return &Timeline{db: db} }

func (r *Timeline) MyEvents(ctx context.Context, userID uuid.UUID, filter models.MyEventFilter,
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
		SELECT h.id, h.display_id, h.title, h.organizer, h.start_at, h.end_at, h.archived_at,
		       p.team_role,
		       r.url, r.deadline_at, r.state,
		       s.display_id, s.status, s.todo_cycle, s.registered_at `+from+where+`
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
			rawID       uuid.UUID
			archivedAt  *time.Time
			regURL      *string
			regDeadline *time.Time
			regState    *models.RegistrationState
			statusID    *string
			statusValue *models.RegistrationStatusValue
			todoCycle   *int
			registered  *time.Time
		)
		if err := rows.Scan(&rawID, &item.ID, &item.Title, &item.Organizer, &item.StartAt, &item.EndAt, &archivedAt,
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
		ids = append(ids, rawID)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, mapError(err)
	}

	next, err := r.nextStages(ctx, ids, now)
	if err != nil {
		return nil, 0, err
	}
	for i := range items {
		if stage, ok := next[ids[i]]; ok {
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
