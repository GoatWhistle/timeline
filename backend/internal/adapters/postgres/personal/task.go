package personal

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Tasks struct{ db *postgres.DB }

func NewTasks(db *postgres.DB) *Tasks { return &Tasks{db: db} }

const taskColumns = `id, display_id, event_id,
	(SELECT e.display_id FROM events e WHERE e.id = event_id),
	stage_id,
	(SELECT st.display_id FROM stages st WHERE st.id = stage_id),
	title, notes, due_at, done_at,
	sort_order, created_at, updated_at`

func scanTask(row pgx.Row) (*models.ParticipantTask, error) {
	var t models.ParticipantTask
	err := row.Scan(&t.ID, &t.DisplayID, &t.EventID, &t.EventDisplayID, &t.StageID, &t.StageDisplayID,
		&t.Title, &t.Notes,
		&t.DueAt, &t.DoneAt, &t.SortOrder, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &t, nil
}

func (r *Tasks) Create(ctx context.Context, userID, eventID uuid.UUID,
	req dto.CreateTaskRequest, stageID *uuid.UUID, title string,
	sortOrder int) (*models.ParticipantTask, error) {
	var stageEventID *uuid.UUID
	if stageID != nil {
		stageEventID = &eventID
	}
	return scanTask(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO participant_tasks
			(user_id, event_id, stage_id, stage_event_id, title, notes, due_at, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING `+taskColumns,
		userID, eventID, stageID, stageEventID, title, req.Notes, req.DueAt, sortOrder))
}

func (r *Tasks) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM participant_tasks WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("task not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Tasks) GetOwned(ctx context.Context, userID, id uuid.UUID) (*models.ParticipantTask, error) {
	return scanTask(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+taskColumns+` FROM participant_tasks WHERE id = $1 AND user_id = $2`, id, userID))
}

func (r *Tasks) ListByEvent(ctx context.Context, userID, eventID uuid.UUID) ([]models.ParticipantTask, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+taskColumns+` FROM participant_tasks
		WHERE user_id = $1 AND event_id = $2
		ORDER BY sort_order, created_at`, userID, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.ParticipantTask, 0, 16)
	for rows.Next() {
		var t models.ParticipantTask
		if err := rows.Scan(&t.ID, &t.DisplayID, &t.EventID, &t.EventDisplayID, &t.StageID, &t.StageDisplayID,
			&t.Title, &t.Notes,
			&t.DueAt, &t.DoneAt, &t.SortOrder, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, t)
	}
	return items, mapError(rows.Err())
}

func (r *Tasks) Update(ctx context.Context, userID, id uuid.UUID,
	patch dto.TaskPatch, eventID uuid.UUID) (*models.ParticipantTask, error) {
	sets := make([]string, 0, 7)
	args := []any{id, userID}

	if patch.Title != nil {
		args = append(args, *patch.Title)
		sets = append(sets, "title = $"+itoa(len(args)))
	}
	if patch.NotesSet {
		args = append(args, patch.Notes)
		sets = append(sets, "notes = $"+itoa(len(args)))
	}
	if patch.DueAtSet {
		args = append(args, patch.DueAt)
		sets = append(sets, "due_at = $"+itoa(len(args)))
	}
	if patch.StageSet {
		args = append(args, patch.StageID)
		sets = append(sets, "stage_id = $"+itoa(len(args)))
		if patch.StageID == nil {
			sets = append(sets, "stage_event_id = NULL")
		} else {
			args = append(args, eventID)
			sets = append(sets, "stage_event_id = $"+itoa(len(args)))
		}
	}
	if patch.SortOrder != nil {
		args = append(args, *patch.SortOrder)
		sets = append(sets, "sort_order = $"+itoa(len(args)))
	}
	if patch.Done != nil {
		if *patch.Done {
			sets = append(sets, "done_at = coalesce(done_at, now())")
		} else {
			sets = append(sets, "done_at = NULL")
		}
	}
	if len(sets) == 0 {
		return r.GetOwned(ctx, userID, id)
	}

	query := `UPDATE participant_tasks SET ` + join(sets) +
		` WHERE id = $1 AND user_id = $2 RETURNING ` + taskColumns
	return scanTask(r.db.Q(ctx).QueryRow(ctx, query, args...))
}

func (r *Tasks) Delete(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM participant_tasks WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Tasks) CountByEvent(ctx context.Context, userID, eventID uuid.UUID) (int, error) {
	var total int
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM participant_tasks WHERE user_id = $1 AND event_id = $2`,
		userID, eventID).Scan(&total)
	return total, mapError(err)
}

func (r *Tasks) ExistingTitles(ctx context.Context, userID, eventID uuid.UUID) (map[string]bool, error) {
	rows, err := r.db.Q(ctx).Query(ctx,
		`SELECT lower(btrim(title)) FROM participant_tasks WHERE user_id = $1 AND event_id = $2`,
		userID, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	titles := make(map[string]bool, 16)
	for rows.Next() {
		var title string
		if err := rows.Scan(&title); err != nil {
			return nil, mapError(err)
		}
		titles[title] = true
	}
	return titles, mapError(rows.Err())
}

func (r *Tasks) NextSortOrder(ctx context.Context, userID, eventID uuid.UUID) (int, error) {
	var next int
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT coalesce(max(sort_order) + 1, 0) FROM participant_tasks
		WHERE user_id = $1 AND event_id = $2`, userID, eventID).Scan(&next)
	return next, mapError(err)
}

func join(items []string) string {
	out := ""
	for i, item := range items {
		if i > 0 {
			out += ", "
		}
		out += item
	}
	return out
}
