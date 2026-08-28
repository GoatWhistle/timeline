package personal

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Artifacts struct{ db *postgres.DB }

func NewArtifacts(db *postgres.DB) *Artifacts { return &Artifacts{db: db} }

const artifactColumns = `id, event_id, kind, url, title, submitted_at,
	sort_order, created_at, updated_at`

func scanArtifact(row pgx.Row) (*models.ParticipantArtifact, error) {
	var a models.ParticipantArtifact
	err := row.Scan(&a.ID, &a.EventID, &a.Kind, &a.URL, &a.Title,
		&a.SubmittedAt, &a.SortOrder, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &a, nil
}

func (r *Artifacts) Create(ctx context.Context, userID, eventID uuid.UUID,
	kind models.ArtifactKind, url string, title *string, sortOrder int) (*models.ParticipantArtifact, error) {
	return scanArtifact(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO participant_artifacts (user_id, event_id, kind, url, title, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+artifactColumns, userID, eventID, kind, url, title, sortOrder))
}

func (r *Artifacts) GetOwned(ctx context.Context, userID, id uuid.UUID) (*models.ParticipantArtifact, error) {
	return scanArtifact(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+artifactColumns+` FROM participant_artifacts WHERE id = $1 AND user_id = $2`,
		id, userID))
}

func (r *Artifacts) ListByEvent(ctx context.Context, userID, eventID uuid.UUID) ([]models.ParticipantArtifact, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+artifactColumns+` FROM participant_artifacts
		WHERE user_id = $1 AND event_id = $2
		ORDER BY sort_order, created_at`, userID, eventID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	return collectArtifacts(rows)
}

func (r *Artifacts) ListByEvents(ctx context.Context, userID uuid.UUID,
	eventIDs []uuid.UUID) ([]models.ParticipantArtifact, error) {
	if len(eventIDs) == 0 {
		return nil, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+artifactColumns+` FROM participant_artifacts
		WHERE user_id = $1 AND event_id = ANY($2)
		ORDER BY event_id, sort_order, created_at`, userID, eventIDs)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()
	return collectArtifacts(rows)
}

func collectArtifacts(rows pgx.Rows) ([]models.ParticipantArtifact, error) {
	items := make([]models.ParticipantArtifact, 0, 16)
	for rows.Next() {
		var a models.ParticipantArtifact
		if err := rows.Scan(&a.ID, &a.EventID, &a.Kind, &a.URL, &a.Title,
			&a.SubmittedAt, &a.SortOrder, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, a)
	}
	return items, mapError(rows.Err())
}

func (r *Artifacts) Update(ctx context.Context, userID, id uuid.UUID,
	patch models.ArtifactPatch) (*models.ParticipantArtifact, error) {
	sets := make([]string, 0, 5)
	args := []any{id, userID}

	if patch.Kind != nil {
		args = append(args, *patch.Kind)
		sets = append(sets, "kind = $"+itoa(len(args)))
	}
	if patch.URL != nil {
		args = append(args, *patch.URL)
		sets = append(sets, "url = $"+itoa(len(args)))
	}
	if patch.TitleSet {
		args = append(args, patch.Title)
		sets = append(sets, "title = $"+itoa(len(args)))
	}
	if patch.SortOrder != nil {
		args = append(args, *patch.SortOrder)
		sets = append(sets, "sort_order = $"+itoa(len(args)))
	}
	if patch.Submitted != nil {
		if *patch.Submitted {
			sets = append(sets, "submitted_at = coalesce(submitted_at, now())")
		} else {
			sets = append(sets, "submitted_at = NULL")
		}
	}
	if len(sets) == 0 {
		return r.GetOwned(ctx, userID, id)
	}

	query := `UPDATE participant_artifacts SET ` + join(sets) +
		` WHERE id = $1 AND user_id = $2 RETURNING ` + artifactColumns
	return scanArtifact(r.db.Q(ctx).QueryRow(ctx, query, args...))
}

func (r *Artifacts) Delete(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM participant_artifacts WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func (r *Artifacts) CountByEvent(ctx context.Context, userID, eventID uuid.UUID) (int, error) {
	var total int
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT count(*) FROM participant_artifacts WHERE user_id = $1 AND event_id = $2`,
		userID, eventID).Scan(&total)
	return total, mapError(err)
}

func (r *Artifacts) NextSortOrder(ctx context.Context, userID, eventID uuid.UUID) (int, error) {
	var next int
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT coalesce(max(sort_order) + 1, 0) FROM participant_artifacts
		WHERE user_id = $1 AND event_id = $2`, userID, eventID).Scan(&next)
	return next, mapError(err)
}
