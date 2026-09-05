package event

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type Notifier interface {
	CreatePrimary(ctx context.Context, c models.ReconcileCandidate) (int, error)
	CancelForRegistration(ctx context.Context, registrationID uuid.UUID) error
	CancelForEvent(ctx context.Context, eventID uuid.UUID) error
}
