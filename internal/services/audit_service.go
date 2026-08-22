package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// AuditService записывает и читает журнал административных изменений.
// Запись выполняется в той же транзакции, что и изменение данных.
type AuditService struct {
	repo *repositories.AuditRepository
}

// NewAuditService создаёт сервис аудита.
func NewAuditService(repo *repositories.AuditRepository) *AuditService {
	return &AuditService{repo: repo}
}

// Record добавляет запись журнала. Снимки before и after должны содержать
// только изменённые бизнес-поля: пароли, токены и секреты каналов исключаются.
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

// List возвращает страницу журнала. Доступ только администратору.
func (s *AuditService) List(ctx context.Context, actor models.Actor, filter models.AuditFilter,
	page models.Page) ([]models.AuditResponse, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("журнал аудита доступен только администратору")
	}
	return s.repo.List(ctx, filter, page)
}
