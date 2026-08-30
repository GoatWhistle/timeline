package query

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func scheduleQuery(filter models.ScheduleFilter, forUserID *uuid.UUID) (string, []any) {
	conds := []string{
		"h.start_at <= $2",
		"h.end_at >= $1",
	}
	args := []any{filter.From, filter.To}
	assigned := func(arg int) string {
		return "EXISTS (SELECT 1 FROM event_participants p WHERE p.event_id = h.id " +
			"AND p.user_id = $" + itoa(arg) + " AND p.participation_status = 'ASSIGNED')"
	}

	if forUserID != nil {
		args = append(args, *forUserID)
		conds = append(conds,
			"h.published_at IS NOT NULL",
			"h.archived_at IS NULL",
			assigned(len(args)))
	} else {
		if filter.ParticipantUser != nil {
			args = append(args, *filter.ParticipantUser)
			conds = append(conds, assigned(len(args)))
		}
		if !filter.IncludeArchived {
			conds = append(conds, "h.archived_at IS NULL")
		}
	}

	mineSelect := "NULL::text, NULL::uuid, NULL::text, NULL::int, NULL::timestamptz"
	mineJoin := ""
	if forUserID != nil {
		mineSelect = "mine.team_role, mine.status_id, mine.status, mine.todo_cycle, mine.registered_at"
		mineJoin = `
		LEFT JOIN LATERAL (
			SELECT p.team_role, s.display_id AS status_id, s.status, s.todo_cycle, s.registered_at
			FROM event_participants p
			LEFT JOIN registration_statuses s ON s.participant_id = p.id
			WHERE p.event_id = h.id AND p.user_id = $` + itoa(len(args)) + `
			LIMIT 1
		) mine ON TRUE`
	}

	return `
		SELECT h.id, h.display_id, h.title, h.start_at, h.end_at, h.published_at, h.archived_at,
		       h.format, h.country_code, h.city,
		       (SELECT r.deadline_at FROM registrations r WHERE r.event_id = h.id AND r.state = 'ACTIVE'),
		       ` + mineSelect + `
		FROM events h` + mineJoin + `
		WHERE ` + strings.Join(conds, " AND ") + `
		ORDER BY h.start_at`, args
}

func (r *Timeline) ScheduleRows(ctx context.Context, filter models.ScheduleFilter, forUserID *uuid.UUID,
	now time.Time) ([]dto.ScheduleRow, error) {
	sql, args := scheduleQuery(filter, forUserID)
	rows, err := r.db.Q(ctx).Query(ctx, sql, args...)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	result := make([]dto.ScheduleRow, 0, 32)
	ids := make([]uuid.UUID, 0, 32)
	events := make([]models.Event, 0, 32)
	for rows.Next() {
		var (
			row         dto.ScheduleRow
			publishedAt *time.Time
			archivedAt  *time.Time
			event       models.Event
			statusID    *string
			statusValue *models.RegistrationStatusValue
			todoCycle   *int
			registered  *time.Time
		)
		if err := rows.Scan(&row.EventUUID, &row.EventID, &row.Title, &row.StartAt, &row.EndAt,
			&publishedAt, &archivedAt,
			&event.Format, &event.CountryCode, &event.City, &row.RegistrationDeadline,
			&row.TeamRole, &statusID, &statusValue, &todoCycle, &registered); err != nil {
			return nil, mapError(err)
		}
		if statusID != nil && statusValue != nil && todoCycle != nil {
			row.RegistrationStatus = &dto.RegistrationStatusShort{
				ID: *statusID, Status: *statusValue, TodoCycle: *todoCycle, RegisteredAt: registered,
			}
		}
		events = append(events, event)
		if publishedAt == nil && archivedAt == nil {
			row.State = models.EventUnpublished
		} else {
			row.State = computeState(archivedAt, row.StartAt, row.EndAt, now)
		}
		row.Stages = []dto.ScheduleItem{}
		result = append(result, row)
		ids = append(ids, row.EventUUID)
	}
	if err := rows.Err(); err != nil {
		return nil, mapError(err)
	}

	stages, err := r.scheduleStages(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range result {
		items := stages[ids[i]]
		result[i].EffectiveFormat = models.DeriveEventFormat(&events[i], items)
		for j := range items {
			result[i].Stages = append(result[i].Stages, dto.ScheduleItem{
				ID: items[j].DisplayID, StageUUID: items[j].ID, Name: items[j].Name, Type: items[j].Type,
				StartAt: items[j].StartAt, EndAt: items[j].EndAt,
				Place: items[j].ResolvePlace(&events[i]),
			})
		}
	}
	return result, nil
}

func (r *Timeline) scheduleStages(ctx context.Context,
	ids []uuid.UUID) (map[uuid.UUID][]models.Stage, error) {
	result := make(map[uuid.UUID][]models.Stage, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT event_id, id, display_id, name, type, start_at, end_at,
		       format, country_code, city, venue, online_url
		FROM stages WHERE event_id = ANY($1)
		ORDER BY sort_order, start_at`, ids)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var stage models.Stage
		if err := rows.Scan(&stage.EventID, &stage.ID, &stage.DisplayID, &stage.Name, &stage.Type,
			&stage.StartAt, &stage.EndAt, &stage.Format, &stage.CountryCode,
			&stage.City, &stage.Venue, &stage.OnlineURL); err != nil {
			return nil, mapError(err)
		}
		result[stage.EventID] = append(result[stage.EventID], stage)
	}
	return result, mapError(rows.Err())
}
