package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// UserService реализует административные операции над учётными записями.
type UserService struct {
	db       *repositories.DB
	users    *repositories.UserRepository
	sessions *repositories.SessionRepository
	notifier *NotificationService
	audit    *AuditService
}

// NewUserService создаёт сервис управления учётными записями.
func NewUserService(db *repositories.DB, users *repositories.UserRepository,
	sessions *repositories.SessionRepository, notifier *NotificationService, audit *AuditService) *UserService {
	return &UserService{db: db, users: users, sessions: sessions, notifier: notifier, audit: audit}
}

// Search ищет пользователей для выбора участников хакатона.
func (s *UserService) Search(ctx context.Context, actor models.Actor, query string, page models.Page) ([]models.UserSummary, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("поиск пользователей доступен только администратору")
	}
	return s.users.Search(ctx, query, page)
}

// SetActive деактивирует или активирует учётную запись.
// Обратная активация не воскрешает ранее отменённые уведомления.
func (s *UserService) SetActive(ctx context.Context, actor models.Actor, userID uuid.UUID, active bool) error {
	if !actor.IsAdmin {
		return models.NewForbidden("операция доступна только администратору")
	}
	if !active {
		return deactivateUser(ctx, s.db, s.users, s.sessions, s.notifier, s.audit, actor, userID)
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		user, err := s.users.GetByID(ctx, userID)
		if err != nil {
			return err
		}
		if user.DeletedAt != nil {
			return models.NewConflict("user_deleted", "удалённую учётную запись восстановить нельзя")
		}
		if user.IsActive {
			return models.NewConflict("already_active", "учётная запись уже активна")
		}
		if err := s.users.SetActive(ctx, userID, true); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserActivate, models.EntityUser, userID,
			map[string]any{"is_active": false}, map[string]any{"is_active": true})
	})
}

// Delete необратимо обезличивает учётную запись. Ссылки участия и записи
// аудита сохраняются, credentials и каналы доставки удаляются.
func (s *UserService) Delete(ctx context.Context, actor models.Actor, userID uuid.UUID) error {
	if !actor.IsAdmin {
		return models.NewForbidden("удаление доступно только администратору")
	}
	if actor.UserID == userID {
		return models.NewConflict("self_delete", "нельзя удалить собственную учётную запись")
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		user, err := s.users.GetByID(ctx, userID)
		if err != nil {
			return err
		}
		if user.DeletedAt != nil {
			return models.NewConflict("already_deleted", "учётная запись уже удалена")
		}
		if err := s.sessions.RevokeAllForUser(ctx, userID); err != nil {
			return err
		}
		if err := s.notifier.CancelForRecipient(ctx, userID); err != nil {
			return err
		}
		if err := s.users.Anonymize(ctx, userID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserDelete, models.EntityUser, userID,
			map[string]any{"email": user.Email, "display_name": user.DisplayName},
			map[string]any{"deleted": true})
	})
}
