package auth

import (
	"context"

	"github.com/google/uuid"
)

type Notifier interface {
	CancelForRecipient(ctx context.Context, userID uuid.UUID) error
}
