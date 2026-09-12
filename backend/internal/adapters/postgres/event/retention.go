package event

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/models"
)

const retentionColumns = `archive_after_days, delete_archive_after_months,
	delete_covers_on_archive, audit_log_retention_days, updated_by, updated_at`

func scanRetention(row pgx.Row) (*models.RetentionSettings, error) {
	var s models.RetentionSettings
	if err := row.Scan(&s.ArchiveAfterDays, &s.DeleteArchiveAfterMonths,
		&s.DeleteCoversOnArchive, &s.AuditLogRetentionDays, &s.UpdatedBy, &s.UpdatedAt); err != nil {
		return nil, mapError(err)
	}
	return &s, nil
}

func (r *Events) GetRetentionSettings(ctx context.Context) (*models.RetentionSettings, error) {
	return scanRetention(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO retention_settings (id) VALUES (1)
		ON CONFLICT (id) DO UPDATE SET id = retention_settings.id
		RETURNING `+retentionColumns))
}

func (r *Events) UpdateRetentionSettings(ctx context.Context, actorID *uuid.UUID,
	archiveAfterDays, deleteArchiveAfterMonths *int, deleteCoversOnArchive bool, auditLogRetentionDays int,
) (*models.RetentionSettings, error) {
	return scanRetention(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO retention_settings
			(id, archive_after_days, delete_archive_after_months,
			 delete_covers_on_archive, audit_log_retention_days, updated_by, updated_at)
		VALUES (1, $1, $2, $3, $4, $5, now())
		ON CONFLICT (id) DO UPDATE SET
			archive_after_days = EXCLUDED.archive_after_days,
			delete_archive_after_months = EXCLUDED.delete_archive_after_months,
			delete_covers_on_archive = EXCLUDED.delete_covers_on_archive,
			audit_log_retention_days = EXCLUDED.audit_log_retention_days,
			updated_by = EXCLUDED.updated_by,
			updated_at = EXCLUDED.updated_at
		RETURNING `+retentionColumns,
		archiveAfterDays, deleteArchiveAfterMonths, deleteCoversOnArchive, auditLogRetentionDays, actorID))
}

func (r *Events) FinishedPublishedBefore(ctx context.Context, cutoff time.Time, limit int,
) ([]uuid.UUID, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT id FROM events
		WHERE archived_at IS NULL AND published_at IS NOT NULL AND end_at < $1
		ORDER BY end_at
		LIMIT $2`, cutoff, limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	ids := make([]uuid.UUID, 0, limit)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, mapError(err)
		}
		ids = append(ids, id)
	}
	return ids, mapError(rows.Err())
}

func (r *Events) ArchivedWithoutPurgeBefore(ctx context.Context, cutoff time.Time, limit int,
) ([]uuid.UUID, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT id FROM events
		WHERE archived_at IS NOT NULL AND archived_at < $1 AND purge_scheduled_at IS NULL
		ORDER BY archived_at
		LIMIT $2`, cutoff, limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	ids := make([]uuid.UUID, 0, limit)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, mapError(err)
		}
		ids = append(ids, id)
	}
	return ids, mapError(rows.Err())
}

func (r *Events) PurgeDueBefore(ctx context.Context, cutoff time.Time, limit int) ([]uuid.UUID, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT id FROM events
		WHERE purge_scheduled_at IS NOT NULL AND purge_scheduled_at <= $1
		ORDER BY purge_scheduled_at
		LIMIT $2`, cutoff, limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	ids := make([]uuid.UUID, 0, limit)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, mapError(err)
		}
		ids = append(ids, id)
	}
	return ids, mapError(rows.Err())
}

func (r *Events) SchedulePurge(ctx context.Context, id uuid.UUID, at time.Time) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET purge_scheduled_at = $2
		WHERE id = $1
		RETURNING `+eventColumns, id, at))
}

func (r *Events) CancelPurge(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return scanEvent(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE events SET purge_scheduled_at = NULL
		WHERE id = $1
		RETURNING `+eventColumns, id))
}
