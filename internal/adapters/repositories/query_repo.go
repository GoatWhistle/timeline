package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// QueryRepository — read-модели пользовательских и административных экранов.
type QueryRepository struct{ db *DB }

// NewQueryRepository создаёт репозиторий read-моделей.
func NewQueryRepository(db *DB) *QueryRepository { return &QueryRepository{db: db} }

// MyHackathons возвращает опубликованные хакатоны с назначенным участием.
// Архивные скрыты по умолчанию и доступны фильтром (AC-UI-01).
func (r *QueryRepository) MyHackathons(ctx context.Context, userID uuid.UUID, filter models.MyHackathonFilter,
	page models.Page, now time.Time) ([]models.MyHackathonItem, int64, error) {
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
			case models.HackathonArchived:
				stateConds = append(stateConds, `h.archived_at IS NOT NULL`)
			case models.HackathonUpcoming:
				stateConds = append(stateConds, `(h.archived_at IS NULL AND h.start_at > `+nowArg+`)`)
			case models.HackathonActive:
				stateConds = append(stateConds, `(h.archived_at IS NULL AND h.start_at <= `+nowArg+` AND h.end_at >= `+nowArg+`)`)
			case models.HackathonFinished:
				stateConds = append(stateConds, `(h.archived_at IS NULL AND h.end_at < `+nowArg+`)`)
			}
		}
		if len(stateConds) > 0 {
			conds = append(conds, "("+strings.Join(stateConds, " OR ")+")")
		}
	}
	where := "WHERE " + strings.Join(conds, " AND ")

	from := `
		FROM hackathon_participants p
		JOIN hackathons h ON h.id = p.hackathon_id
		LEFT JOIN registrations r ON r.hackathon_id = h.id
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

	items := make([]models.MyHackathonItem, 0, page.Limit())
	ids := make([]uuid.UUID, 0, page.Limit())
	for rows.Next() {
		var (
			item        models.MyHackathonItem
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

// computeState повторяет вычисление состояния хакатона в SQL-выборках,
// где полная модель не читается.
func computeState(archivedAt *time.Time, start, end, now time.Time) models.HackathonState {
	switch {
	case archivedAt != nil:
		return models.HackathonArchived
	case now.Before(start):
		return models.HackathonUpcoming
	case now.After(end):
		return models.HackathonFinished
	default:
		return models.HackathonActive
	}
}

// nextStages подбирает ближайший предстоящий или идущий этап каждого хакатона.
func (r *QueryRepository) nextStages(ctx context.Context, hackathonIDs []uuid.UUID, now time.Time) (map[uuid.UUID]models.StageShort, error) {
	result := make(map[uuid.UUID]models.StageShort, len(hackathonIDs))
	if len(hackathonIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT DISTINCT ON (hackathon_id) hackathon_id, id, name, type, start_at, end_at
		FROM stages
		WHERE hackathon_id = ANY($1) AND end_at >= $2
		ORDER BY hackathon_id, start_at`, hackathonIDs, now)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			hackathonID uuid.UUID
			stage       models.StageShort
		)
		if err := rows.Scan(&hackathonID, &stage.ID, &stage.Name, &stage.Type, &stage.StartAt, &stage.EndAt); err != nil {
			return nil, mapError(err)
		}
		result[hackathonID] = stage
	}
	return result, mapError(rows.Err())
}

// NextStage возвращает ближайший этап одного хакатона.
func (r *QueryRepository) NextStage(ctx context.Context, hackathonID uuid.UUID, now time.Time) (*models.StageShort, error) {
	stages, err := r.nextStages(ctx, []uuid.UUID{hackathonID}, now)
	if err != nil {
		return nil, err
	}
	if stage, ok := stages[hackathonID]; ok {
		return &stage, nil
	}
	return nil, nil
}

// TimelineRows собирает строки временной шкалы за период.
func (r *QueryRepository) TimelineRows(ctx context.Context, filter models.TimelineFilter, forUserID *uuid.UUID,
	now time.Time) ([]models.TimelineRow, error) {
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
			"EXISTS (SELECT 1 FROM hackathon_participants p WHERE p.hackathon_id = h.id AND p.user_id = $"+
				itoa(len(args))+" AND p.participation_status = 'ASSIGNED')")
	} else {
		if filter.ParticipantUser != nil {
			args = append(args, *filter.ParticipantUser)
			conds = append(conds,
				"EXISTS (SELECT 1 FROM hackathon_participants p WHERE p.hackathon_id = h.id AND p.user_id = $"+
					itoa(len(args))+" AND p.participation_status = 'ASSIGNED')")
		}
		if !filter.IncludeArchived {
			conds = append(conds, "h.archived_at IS NULL")
		}
	}

	roleSelect := "NULL::text"
	if forUserID != nil {
		roleSelect = `(SELECT p.team_role FROM hackathon_participants p
			WHERE p.hackathon_id = h.id AND p.user_id = $` + itoa(len(args)) + ` LIMIT 1)`
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT h.id, h.title, h.start_at, h.end_at, h.published_at, h.archived_at,
		       `+roleSelect+`,
		       (SELECT r.deadline_at FROM registrations r WHERE r.hackathon_id = h.id AND r.state = 'ACTIVE')
		FROM hackathons h
		WHERE `+strings.Join(conds, " AND ")+`
		ORDER BY h.start_at`, args...)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	result := make([]models.TimelineRow, 0, 32)
	ids := make([]uuid.UUID, 0, 32)
	for rows.Next() {
		var (
			row         models.TimelineRow
			publishedAt *time.Time
			archivedAt  *time.Time
		)
		if err := rows.Scan(&row.HackathonID, &row.Title, &row.StartAt, &row.EndAt, &publishedAt, &archivedAt,
			&row.TeamRole, &row.RegistrationDeadline); err != nil {
			return nil, mapError(err)
		}
		if publishedAt == nil && archivedAt == nil {
			row.State = models.HackathonUnpublished
		} else {
			row.State = computeState(archivedAt, row.StartAt, row.EndAt, now)
		}
		row.Stages = []models.TimelineItem{}
		result = append(result, row)
		ids = append(ids, row.HackathonID)
	}
	if err := rows.Err(); err != nil {
		return nil, mapError(err)
	}

	stages, err := r.timelineStages(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range result {
		if items, ok := stages[result[i].HackathonID]; ok {
			result[i].Stages = items
		}
	}
	return result, nil
}

func (r *QueryRepository) timelineStages(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]models.TimelineItem, error) {
	result := make(map[uuid.UUID][]models.TimelineItem, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT hackathon_id, id, name, type, start_at, end_at FROM stages
		WHERE hackathon_id = ANY($1)
		ORDER BY sort_order, start_at`, ids)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			hackathonID uuid.UUID
			item        models.TimelineItem
		)
		if err := rows.Scan(&hackathonID, &item.ID, &item.Name, &item.Type, &item.StartAt, &item.EndAt); err != nil {
			return nil, mapError(err)
		}
		result[hackathonID] = append(result[hackathonID], item)
	}
	return result, mapError(rows.Err())
}

// Deadlines возвращает выборку ближайших либо просроченных дедлайнов.
// Просроченными считаются статусы TODO, у которых дедлайн прошёл,
// а хакатон ещё не завершён.
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
		JOIN hackathons h ON h.id = s.hackathon_id
		JOIN hackathon_participants p ON p.id = s.participant_id
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
		if err := rows.Scan(&item.HackathonID, &item.HackathonTitle, &item.ParticipantID,
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
