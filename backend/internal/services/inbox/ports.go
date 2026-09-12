package inbox

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type RegistrationMarker interface {
	MarkDone(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*dto.RegistrationStatusResponse, error)
}

type Notifier interface {
	NotifyInbox(ctx context.Context, userID uuid.UUID) error
}
