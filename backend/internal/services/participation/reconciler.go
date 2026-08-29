package participation

import (
	"context"

	"github.com/google/uuid"
)

type Reconciler interface {
	ReconcileEvent(ctx context.Context, eventID uuid.UUID) error
}
