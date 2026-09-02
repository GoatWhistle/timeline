package cover

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/blobstore"
	"github.com/GoatWhistle/timeline/internal/services/shared/imagefetch"
)

type TxRunner interface {
	WithTx(ctx context.Context, fn func(context.Context) error) error
}

type Recorder interface {
	Record(ctx context.Context, actor models.Actor, action models.AuditAction,
		entityType models.EntityType, entityID uuid.UUID, before, after any) error
}

type BlobStore interface {
	Put(ctx context.Context, key string, data []byte, contentType string) error
	Open(ctx context.Context, key string) (*blobstore.Blob, error)
	Delete(ctx context.Context, key string) error
}

type EventStore interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error)
	GetForUpdate(ctx context.Context, id uuid.UUID) (*models.Event, error)
	ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error)
	SetManualCover(ctx context.Context, id uuid.UUID, url *string) (*models.Event, error)
	SetAutoCover(ctx context.Context, id uuid.UUID, url *string, source *string,
		fetchedAt *time.Time) (*models.Event, error)
}

type Fetcher interface {
	FetchCover(ctx context.Context, pageURL string) (*imagefetch.Cover, error)
}
