package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/models"
)

type AuditService struct {
	repo *audit.Audit
}

func NewAuditService(repo *audit.Audit) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Record(ctx context.Context, actor models.Actor, action models.AuditAction,
	entityType models.EntityType, entityID uuid.UUID, before, after any) error {
	var requestID *string
	if actor.RequestID != "" {
		id := actor.RequestID
		requestID = &id
	}
	var entity *uuid.UUID
	if entityID != uuid.Nil {
		id := entityID
		entity = &id
	}
	return s.repo.Insert(ctx, &models.AuditLog{
		ActorUserID: actor.UserRef(),
		Action:      action,
		EntityType:  entityType,
		EntityID:    entity,
		BeforeJSON:  before,
		AfterJSON:   after,
		RequestID:   requestID,
	})
}

func (s *AuditService) List(ctx context.Context, actor models.Actor, filter models.AuditFilter,
	page models.Page) ([]models.AuditResponse, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the audit log is restricted to administrators")
	}
	return s.repo.List(ctx, filter, page)
}
