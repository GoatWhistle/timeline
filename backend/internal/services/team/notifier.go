package team

import (
	"context"

	"github.com/google/uuid"
)

type Notifier interface {
	CancelForStatus(ctx context.Context, statusID uuid.UUID) error
}
