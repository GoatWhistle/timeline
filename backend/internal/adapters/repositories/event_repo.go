package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type EventRepository struct{ db *DB }

func NewEventRepository(db *DB) *EventRepository { return &EventRepository{db: db} }

const eventColumns = `id, title, description, organizer, website_url, notes,
	start_at, end_at, published_at, archived_at, created_at, updated_at`

func scanEvent(row pgx.Row) (*models.Event, error) {
	var h models.Event
	err := row.Scan(&h.ID, &h.Title, &h.Description, &h.Organizer, &h.WebsiteURL, &h.Notes,
		&h.StartAt, &h.EndAt, &h.PublishedAt, &h.ArchivedAt, &h.CreatedAt, &h.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &h, nil
}

func (r *EventRepository) Create(ctx context.Context, h *models.Event) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO events (title, description, organizer, website_url, notes, start_at, end_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+eventColumns,
		h.Title, h.Description, h.Organizer, h.WebsiteURL, h.Notes, h.StartAt, h.EndAt))
}

func (r *EventRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `SELECT `+eventColumns+` FROM events WHERE id = $1`, id))
}

func (r *EventRepository) GetForUpdate(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+eventColumns+` FROM events WHERE id = $1 FOR UPDATE`, id))
}

func (r *EventRepository) Update(ctx context.Context, id uuid.UUID, req models.UpdateEventRequest) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET
			title = COALESCE($2, title),
			description = COALESCE($3, description),
			organizer = COALESCE($4, organizer),
			website_url = COALESCE($5, website_url),
			notes = COALESCE($6, notes),
			start_at = COALESCE($7, start_at),
			end_at = COALESCE($8, end_at)
		WHERE id = $1
		RETURNING `+eventColumns,
		id, req.Title, req.Description, req.Organizer, req.WebsiteURL, req.Notes, req.StartAt, req.EndAt))
}

func (r *EventRepository) Publish(ctx context.Context, id uuid.UUID, at time.Time) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET published_at = $2
		WHERE id = $1 AND published_at IS NULL AND archived_at IS NULL
		RETURNING `+eventColumns, id, at))
}

func (r *EventRepository) Archive(ctx context.Context, id uuid.UUID, at time.Time) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET archived_at = $2
		WHERE id = $1 AND archived_at IS NULL
		RETURNING `+eventColumns, id, at))
}

func (r *EventRepository) List(ctx context.Context, filter models.EventFilter, page models.Page, now time.Time) ([]models.Event, int64, error) {
	where, args := eventFilterSQL(filter, now)

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) FROM events `+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+eventColumns+` FROM events `+where+`
		ORDER BY start_at DESC, title
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Event, 0, page.Limit())
	for rows.Next() {
		var h models.Event
		if err := rows.Scan(&h.ID, &h.Title, &h.Description, &h.Organizer, &h.WebsiteURL, &h.Notes,
			&h.StartAt, &h.EndAt, &h.PublishedAt, &h.ArchivedAt, &h.CreatedAt, &h.UpdatedAt); err != nil {
			return nil, 0, mapError(err)
		}
		items = append(items, h)
	}
	return items, total, mapError(rows.Err())
}

func eventFilterSQL(filter models.EventFilter, now time.Time) (string, []any) {
	conds := make([]string, 0, 4)
	args := make([]any, 0, 4)

	if filter.Search != "" {
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
		conds = append(conds, `(lower(title) LIKE $`+itoa(len(args))+` OR lower(coalesce(organizer, '')) LIKE $`+itoa(len(args))+`)`)
	}
	if !filter.IncludeArchived && !containsState(filter.States, models.EventArchived) {
		conds = append(conds, `archived_at IS NULL`)
	}
	if len(filter.States) > 0 {
		args = append(args, now)
		nowArg := `$` + itoa(len(args))
		stateConds := make([]string, 0, len(filter.States))
		for _, st := range filter.States {
			switch st {
			case models.EventArchived:
				stateConds = append(stateConds, `archived_at IS NOT NULL`)
			case models.EventUnpublished:
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NULL)`)
			case models.EventUpcoming:
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NOT NULL AND start_at > `+nowArg+`)`)
			case models.EventActive:
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NOT NULL AND start_at <= `+nowArg+` AND end_at >= `+nowArg+`)`)
			case models.EventFinished:
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NOT NULL AND end_at < `+nowArg+`)`)
			}
		}
		if len(stateConds) > 0 {
			conds = append(conds, `(`+strings.Join(stateConds, " OR ")+`)`)
		}
	}
	if len(conds) == 0 {
		return "", args
	}
	return "WHERE " + strings.Join(conds, " AND "), args
}

func containsState(states []models.EventState, target models.EventState) bool {
	for _, s := range states {
		if s == target {
			return true
		}
	}
	return false
}

type StageRepository struct{ db *DB }

func NewStageRepository(db *DB) *StageRepository { return &StageRepository{db: db} }

const stageColumns = `id, event_id, name, type, start_at, end_at, description, url,
	sort_order, created_at, updated_at`

func scanStage(row pgx.Row) (*models.Stage, error) {
	var s models.Stage
	err := row.Scan(&s.ID, &s.EventID, &s.Name, &s.Type, &s.StartAt, &s.EndAt,
		&s.Description, &s.URL, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &s, nil
}

func (r *StageRepository) Create(ctx context.Context, s *models.Stage) (*models.Stage, error) {
	return scanStage(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO stages (event_id, name, type, start_at, end_at, description, url, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING `+stageColumns,
		s.EventID, s.Name, s.Type, s.StartAt, s.EndAt, s.Description, s.URL, s.SortOrder))
}

func (r *StageRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Stage, error) {
	return scanStage(r.db.Q(ctx).QueryRow(ctx, `SELECT `+stageColumns+` FROM stages WHERE id = $1`, id))
}

func (r *StageRepository) Update(ctx context.Context, id uuid.UUID, req models.UpdateStageRequest) (*models.Stage, error) {
	return scanStage(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE stages SET
			name = COALESCE($2, name),
			type = COALESCE($3, type),
			start_at = COALESCE($4, start_at),
			end_at = COALESCE($5, end_at),
			description = COALESCE($6, description),
			url = COALESCE($7, url),
			sort_order = COALESCE($8, sort_order)
		WHERE id = $1
		RETURNING `+stageColumns,
		id, req.Name, req.Type, req.StartAt, req.EndAt, req.Description, req.URL, req.SortOrder))
}

func (r *StageRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `DELETE FROM stages WHERE id = $1`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *StageRepository) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]models.Stage, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+stageColumns+` FROM stages WHERE event_id = $1
		ORDER BY sort_order, start_at`, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Stage, 0, 8)
	for rows.Next() {
		var s models.Stage
		if err := rows.Scan(&s.ID, &s.EventID, &s.Name, &s.Type, &s.StartAt, &s.EndAt,
			&s.Description, &s.URL, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, s)
	}
	return items, mapError(rows.Err())
}

func (r *StageRepository) ListByEvents(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]models.Stage, error) {
	result := make(map[uuid.UUID][]models.Stage, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+stageColumns+` FROM stages WHERE event_id = ANY($1)
		ORDER BY sort_order, start_at`, ids)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var s models.Stage
		if err := rows.Scan(&s.ID, &s.EventID, &s.Name, &s.Type, &s.StartAt, &s.EndAt,
			&s.Description, &s.URL, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		result[s.EventID] = append(result[s.EventID], s)
	}
	return result, mapError(rows.Err())
}
