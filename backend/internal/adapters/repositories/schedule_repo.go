package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (r *QueryRepository) ScheduleRows(ctx context.Context, filter models.ScheduleFilter, forUserID *uuid.UUID,
	now time.Time) ([]models.ScheduleRow, error) {
	conds := []string{
		"h.start_at <= $2",
		"h.end_at >= $1",
	}
	args := []any{filter.From, filter.To}

	if forUserID != nil {
		args = append(args, *forUserID)
		conds = append(conds,
			"h.published_at IS NOT NULL",
			"h.archived_at IS NULL",
			"EXISTS (SELECT 1 FROM event_participants p WHERE p.event_id = h.id AND p.user_id = $"+
				itoa(len(args))+" AND p.participation_status = 'ASSIGNED')")
	} else {
		if filter.ParticipantUser != nil {
			args = append(args, *filter.ParticipantUser)
			conds = append(conds,
				"EXISTS (SELECT 1 FROM event_participants p WHERE p.event_id = h.id AND p.user_id = $"+
					itoa(len(args))+" AND p.participation_status = 'ASSIGNED')")
		}
		if !filter.IncludeArchived {
			conds = append(conds, "h.archived_at IS NULL")
		}
	}

	roleSelect := "NULL::text"
	if forUserID != nil {
		roleSelect = `(SELECT p.team_role FROM event_participants p
			WHERE p.event_id = h.id AND p.user_id = $` + itoa(len(args)) + ` LIMIT 1)`
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT h.id, h.title, h.start_at, h.end_at, h.published_at, h.archived_at,
		       h.format, h.country_code, h.city,
		       `+roleSelect+`,
		       (SELECT r.deadline_at FROM registrations r WHERE r.event_id = h.id AND r.state = 'ACTIVE')
		FROM events h
		WHERE `+strings.Join(conds, " AND ")+`
		ORDER BY h.start_at`, args...)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	result := make([]models.ScheduleRow, 0, 32)
	ids := make([]uuid.UUID, 0, 32)
	events := make([]models.Event, 0, 32)
	for rows.Next() {
		var (
			row         models.ScheduleRow
			publishedAt *time.Time
			archivedAt  *time.Time
			event       models.Event
		)
		if err := rows.Scan(&row.EventID, &row.Title, &row.StartAt, &row.EndAt, &publishedAt, &archivedAt,
			&event.Format, &event.CountryCode, &event.City,
			&row.TeamRole, &row.RegistrationDeadline); err != nil {
			return nil, mapError(err)
		}
		events = append(events, event)
		if publishedAt == nil && archivedAt == nil {
			row.State = models.EventUnpublished
		} else {
			row.State = computeState(archivedAt, row.StartAt, row.EndAt, now)
		}
		row.Stages = []models.ScheduleItem{}
		result = append(result, row)
		ids = append(ids, row.EventID)
	}
	if err := rows.Err(); err != nil {
		return nil, mapError(err)
	}

	stages, err := r.scheduleStages(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range result {
		items := stages[result[i].EventID]
		result[i].EffectiveFormat = models.DeriveEventFormat(&events[i], items)
		for j := range items {
			result[i].Stages = append(result[i].Stages, models.ScheduleItem{
				ID: items[j].ID, Name: items[j].Name, Type: items[j].Type,
				StartAt: items[j].StartAt, EndAt: items[j].EndAt,
				Place: items[j].ResolvePlace(&events[i]),
			})
		}
	}
	return result, nil
}

func (r *QueryRepository) scheduleStages(ctx context.Context,
	ids []uuid.UUID) (map[uuid.UUID][]models.Stage, error) {
	result := make(map[uuid.UUID][]models.Stage, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT event_id, id, name, type, start_at, end_at,
		       format, country_code, city, venue, online_url
		FROM stages WHERE event_id = ANY($1)
		ORDER BY sort_order, start_at`, ids)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var stage models.Stage
		if err := rows.Scan(&stage.EventID, &stage.ID, &stage.Name, &stage.Type,
			&stage.StartAt, &stage.EndAt, &stage.Format, &stage.CountryCode,
			&stage.City, &stage.Venue, &stage.OnlineURL); err != nil {
			return nil, mapError(err)
		}
		result[stage.EventID] = append(result[stage.EventID], stage)
	}
	return result, mapError(rows.Err())
}
