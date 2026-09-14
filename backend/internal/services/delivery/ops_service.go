package delivery

import (
	"context"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
)

type OpsService struct {
	db *postgres.DB
}

func NewOpsService(db *postgres.DB) *OpsService {
	return &OpsService{db: db}
}

func (s *OpsService) Ready(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	return s.db.Ping(ctx)
}
