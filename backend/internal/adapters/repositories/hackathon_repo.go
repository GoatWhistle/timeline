package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// HackathonRepository — доступ к хакатонам.
type HackathonRepository struct{ db *DB }

// NewHackathonRepository создаёт репозиторий хакатонов.
func NewHackathonRepository(db *DB) *HackathonRepository { return &HackathonRepository{db: db} }

const hackathonColumns = `id, title, description, organizer, website_url, notes,
	start_at, end_at, published_at, archived_at, created_at, updated_at`

func scanHackathon(row pgx.Row) (*models.Hackathon, error) {
	var h models.Hackathon
	err := row.Scan(&h.ID, &h.Title, &h.Description, &h.Organizer, &h.WebsiteURL, &h.Notes,
		&h.StartAt, &h.EndAt, &h.PublishedAt, &h.ArchivedAt, &h.CreatedAt, &h.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &h, nil
}

// Create сохраняет хакатон в неопубликованном состоянии.
func (r *HackathonRepository) Create(ctx context.Context, h *models.Hackathon) (*models.Hackathon, error) {
	return scanHackathon(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO hackathons (title, description, organizer, website_url, notes, start_at, end_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+hackathonColumns,
		h.Title, h.Description, h.Organizer, h.WebsiteURL, h.Notes, h.StartAt, h.EndAt))
}

// GetByID читает хакатон по идентификатору.
func (r *HackathonRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Hackathon, error) {
	return scanHackathon(r.db.Q(ctx).QueryRow(ctx, `SELECT `+hackathonColumns+` FROM hackathons WHERE id = $1`, id))
}

// GetForUpdate читает хакатон и блокирует строку до конца транзакции.
func (r *HackathonRepository) GetForUpdate(ctx context.Context, id uuid.UUID) (*models.Hackathon, error) {
	return scanHackathon(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+hackathonColumns+` FROM hackathons WHERE id = $1 FOR UPDATE`, id))
}

// Update изменяет поля хакатона. Перенос end_at каскадно обновляет копию
// в регистрации и отклоняется базой, если нарушает действующий дедлайн.
func (r *HackathonRepository) Update(ctx context.Context, id uuid.UUID, req models.UpdateHackathonRequest) (*models.Hackathon, error) {
	return scanHackathon(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE hackathons SET
			title = COALESCE($2, title),
			description = COALESCE($3, description),
			organizer = COALESCE($4, organizer),
			website_url = COALESCE($5, website_url),
			notes = COALESCE($6, notes),
			start_at = COALESCE($7, start_at),
			end_at = COALESCE($8, end_at)
		WHERE id = $1
		RETURNING `+hackathonColumns,
		id, req.Title, req.Description, req.Organizer, req.WebsiteURL, req.Notes, req.StartAt, req.EndAt))
}

// Publish отмечает хакатон опубликованным.
func (r *HackathonRepository) Publish(ctx context.Context, id uuid.UUID, at time.Time) (*models.Hackathon, error) {
	return scanHackathon(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE hackathons SET published_at = $2
		WHERE id = $1 AND published_at IS NULL AND archived_at IS NULL
		RETURNING `+hackathonColumns, id, at))
}

// Archive отмечает хакатон архивированным.
func (r *HackathonRepository) Archive(ctx context.Context, id uuid.UUID, at time.Time) (*models.Hackathon, error) {
	return scanHackathon(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE hackathons SET archived_at = $2
		WHERE id = $1 AND archived_at IS NULL
		RETURNING `+hackathonColumns, id, at))
}

// List возвращает страницу хакатонов с фильтрами административного списка.
func (r *HackathonRepository) List(ctx context.Context, filter models.HackathonFilter, page models.Page, now time.Time) ([]models.Hackathon, int64, error) {
	where, args := hackathonFilterSQL(filter, now)

	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) FROM hackathons `+where, args...).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}

	args = append(args, page.Limit(), page.Offset())
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+hackathonColumns+` FROM hackathons `+where+`
		ORDER BY start_at DESC, title
		LIMIT $`+itoa(len(args)-1)+` OFFSET $`+itoa(len(args)), args...)
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Hackathon, 0, page.Limit())
	for rows.Next() {
		var h models.Hackathon
		if err := rows.Scan(&h.ID, &h.Title, &h.Description, &h.Organizer, &h.WebsiteURL, &h.Notes,
			&h.StartAt, &h.EndAt, &h.PublishedAt, &h.ArchivedAt, &h.CreatedAt, &h.UpdatedAt); err != nil {
			return nil, 0, mapError(err)
		}
		items = append(items, h)
	}
	return items, total, mapError(rows.Err())
}

// hackathonFilterSQL собирает условие выборки. Вычисляемое состояние выражается
// через published_at, archived_at и границы периода.
func hackathonFilterSQL(filter models.HackathonFilter, now time.Time) (string, []any) {
	conds := make([]string, 0, 4)
	args := make([]any, 0, 4)

	if filter.Search != "" {
		args = append(args, "%"+strings.ToLower(filter.Search)+"%")
		conds = append(conds, `(lower(title) LIKE $`+itoa(len(args))+` OR lower(coalesce(organizer, '')) LIKE $`+itoa(len(args))+`)`)
	}
	if !filter.IncludeArchived && !containsState(filter.States, models.HackathonArchived) {
		conds = append(conds, `archived_at IS NULL`)
	}
	if len(filter.States) > 0 {
		args = append(args, now)
		nowArg := `$` + itoa(len(args))
		stateConds := make([]string, 0, len(filter.States))
		for _, st := range filter.States {
			switch st {
			case models.HackathonArchived:
				stateConds = append(stateConds, `archived_at IS NOT NULL`)
			case models.HackathonUnpublished:
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NULL)`)
			case models.HackathonUpcoming:
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NOT NULL AND start_at > `+nowArg+`)`)
			case models.HackathonActive:
				stateConds = append(stateConds, `(archived_at IS NULL AND published_at IS NOT NULL AND start_at <= `+nowArg+` AND end_at >= `+nowArg+`)`)
			case models.HackathonFinished:
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

func containsState(states []models.HackathonState, target models.HackathonState) bool {
	for _, s := range states {
		if s == target {
			return true
		}
	}
	return false
}

// StageRepository — доступ к этапам хакатона.
type StageRepository struct{ db *DB }

// NewStageRepository создаёт репозиторий этапов.
func NewStageRepository(db *DB) *StageRepository { return &StageRepository{db: db} }

const stageColumns = `id, hackathon_id, name, type, start_at, end_at, description, url,
	sort_order, created_at, updated_at`

func scanStage(row pgx.Row) (*models.Stage, error) {
	var s models.Stage
	err := row.Scan(&s.ID, &s.HackathonID, &s.Name, &s.Type, &s.StartAt, &s.EndAt,
		&s.Description, &s.URL, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &s, nil
}

// Create сохраняет этап.
func (r *StageRepository) Create(ctx context.Context, s *models.Stage) (*models.Stage, error) {
	return scanStage(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO stages (hackathon_id, name, type, start_at, end_at, description, url, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING `+stageColumns,
		s.HackathonID, s.Name, s.Type, s.StartAt, s.EndAt, s.Description, s.URL, s.SortOrder))
}

// GetByID читает этап по идентификатору.
func (r *StageRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Stage, error) {
	return scanStage(r.db.Q(ctx).QueryRow(ctx, `SELECT `+stageColumns+` FROM stages WHERE id = $1`, id))
}

// Update изменяет этап.
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

// Delete удаляет этап.
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

// ListByHackathon возвращает этапы хакатона в порядке отображения.
func (r *StageRepository) ListByHackathon(ctx context.Context, hackathonID uuid.UUID) ([]models.Stage, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+stageColumns+` FROM stages WHERE hackathon_id = $1
		ORDER BY sort_order, start_at`, hackathonID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Stage, 0, 8)
	for rows.Next() {
		var s models.Stage
		if err := rows.Scan(&s.ID, &s.HackathonID, &s.Name, &s.Type, &s.StartAt, &s.EndAt,
			&s.Description, &s.URL, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, s)
	}
	return items, mapError(rows.Err())
}

// ListByHackathons возвращает этапы нескольких хакатонов для временной шкалы.
func (r *StageRepository) ListByHackathons(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]models.Stage, error) {
	result := make(map[uuid.UUID][]models.Stage, len(ids))
	if len(ids) == 0 {
		return result, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+stageColumns+` FROM stages WHERE hackathon_id = ANY($1)
		ORDER BY sort_order, start_at`, ids)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	for rows.Next() {
		var s models.Stage
		if err := rows.Scan(&s.ID, &s.HackathonID, &s.Name, &s.Type, &s.StartAt, &s.EndAt,
			&s.Description, &s.URL, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		result[s.HackathonID] = append(result[s.HackathonID], s)
	}
	return result, mapError(rows.Err())
}
