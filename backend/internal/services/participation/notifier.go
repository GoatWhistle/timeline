package participation

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type Notifier interface {
	CreatePrimary(ctx context.Context, c models.ReconcileCandidate) (*models.Notification, bool, error)
	CancelForRegistration(ctx context.Context, registrationID uuid.UUID) error
	CancelForStatus(ctx context.Context, statusID uuid.UUID) error
	CancelForParticipant(ctx context.Context, participantID uuid.UUID) error
}
