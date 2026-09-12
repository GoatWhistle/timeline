package retention

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type EventStore interface {
	GetRetentionSettings(ctx context.Context) (*models.RetentionSettings, error)
	UpdateRetentionSettings(ctx context.Context, actorID *uuid.UUID,
		archiveAfterDays, deleteArchiveAfterMonths *int, deleteCoversOnArchive bool,
		auditLogRetentionDays int) (*models.RetentionSettings, error)
	FinishedPublishedBefore(ctx context.Context, cutoff time.Time, limit int) ([]uuid.UUID, error)
	ArchivedWithoutPurgeBefore(ctx context.Context, cutoff time.Time, limit int) ([]uuid.UUID, error)
	PurgeDueBefore(ctx context.Context, cutoff time.Time, limit int) ([]uuid.UUID, error)
	SchedulePurge(ctx context.Context, id uuid.UUID, at time.Time) (*models.Event, error)
	CancelPurge(ctx context.Context, id uuid.UUID) (*models.Event, error)
	GetForUpdate(ctx context.Context, id uuid.UUID) (*models.Event, error)
}

type Archiver interface {
	Archive(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error)
}

type Deleter interface {
	Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error
}

type CoverClearer interface {
	ClearCoverForArchive(ctx context.Context, id uuid.UUID) error
}

type Recorder interface {
	Record(ctx context.Context, actor models.Actor, action models.AuditAction,
		entityType models.EntityType, entityID uuid.UUID, before, after any) error
}

type UserLookup interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}
