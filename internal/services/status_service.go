package services

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// StatusService обслуживает статусы внешней регистрации участников.
// Статус — самоотчёт пользователя либо административно установленное состояние:
// система не проверяет внешний сайт.
type StatusService struct {
	db            *repositories.DB
	statuses      *repositories.StatusRepository
	registrations *repositories.RegistrationRepository
	participants  *repositories.ParticipantRepository
	hackathons    *repositories.HackathonRepository
	users         *repositories.UserRepository
	notifier      *NotificationService
	reconciler    Reconciler
	audit         *AuditService
}

// NewStatusService создаёт сервис статусов.
func NewStatusService(db *repositories.DB, statuses *repositories.StatusRepository,
	registrations *repositories.RegistrationRepository, participants *repositories.ParticipantRepository,
	hackathons *repositories.HackathonRepository, users *repositories.UserRepository,
	notifier *NotificationService, reconciler Reconciler, audit *AuditService) *StatusService {
	return &StatusService{
		db: db, statuses: statuses, registrations: registrations, participants: participants,
		hackathons: hackathons, users: users, notifier: notifier, reconciler: reconciler, audit: audit,
	}
}

// List возвращает страницу статусов хакатона.
func (s *StatusService) List(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	page models.Page) ([]models.RegistrationStatusResponse, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("операция доступна только администратору")
	}
	return s.statuses.List(ctx, hackathonID, page)
}

// MarkDone переводит собственный статус участника из TODO в DONE.
func (s *StatusService) MarkDone(ctx context.Context, actor models.Actor, hackathonID uuid.UUID) (*models.RegistrationStatusResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("требуется аутентификация")
	}

	var updated *models.RegistrationStatus
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		hackathon, err := s.hackathons.GetByID(ctx, hackathonID)
		if err != nil {
			return err
		}
		if !hackathon.Published() {
			return models.NewNotFound("хакатон не найден")
		}
		if hackathon.Archived() {
			return models.NewStateTransition("хакатон архивирован")
		}

		participant, err := s.participants.GetByHackathonUser(ctx, hackathonID, actor.UserID)
		if err != nil {
			return models.NewNotFound("вы не назначены на этот хакатон")
		}
		if !participant.Assigned() {
			return models.NewNotFound("вы не назначены на этот хакатон")
		}

		registration, err := s.registrations.GetByHackathon(ctx, hackathonID)
		if err != nil {
			return notFoundRegistration(err)
		}
		if !registration.Active() {
			return models.NewStateTransition("регистрация выключена")
		}

		status, err := s.statuses.GetByParticipant(ctx, registration.ID, participant.ID)
		if err != nil {
			return err
		}
		if status.Status == models.StatusDONE {
			updated = status
			return nil
		}
		if status.Status != models.StatusTODO {
			return models.NewStateTransition("перевести в DONE можно только статус TODO")
		}

		updated, err = s.statuses.SetStatus(ctx, status.ID, models.StatusDONE, models.SourceUser, actor.UserRef(), nil)
		if err != nil {
			return err
		}
		// DONE отменяет будущие уведомления этого статуса.
		if err := s.notifier.CancelForStatus(ctx, status.ID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStatusChange, models.EntityRegistrationStatus, status.ID,
			map[string]any{"status": status.Status, "todo_cycle": status.TodoCycle},
			map[string]any{"status": updated.Status, "registered_at": updated.RegisteredAt})
	})
	if err != nil {
		return nil, err
	}
	return s.response(ctx, updated)
}

// AdminChange выполняет административный переход статуса.
func (s *StatusService) AdminChange(ctx context.Context, actor models.Actor, statusID uuid.UUID,
	req models.AdminChangeStatusRequest) (*models.RegistrationStatusResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	if !req.Status.Valid() {
		return nil, models.NewValidation("некорректный статус",
			models.FieldError{Field: "status", Message: "допустимы TODO, DONE и NOT_REQUIRED"})
	}

	var (
		updated   *models.RegistrationStatus
		reconcile uuid.UUID
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		status, err := s.statuses.GetByIDForUpdate(ctx, statusID)
		if err != nil {
			return err
		}
		if status.Status == req.Status {
			updated = status
			return nil
		}

		updated, err = s.statuses.SetStatus(ctx, statusID, req.Status, models.SourceAdmin, actor.UserRef(), req.Note)
		if err != nil {
			return err
		}
		// Любой переход отменяет будущие уведомления прежней ситуации;
		// новый цикл TODO получит собственные записи от согласования.
		if err := s.notifier.CancelForStatus(ctx, statusID); err != nil {
			return err
		}
		if req.Status == models.StatusTODO {
			reconcile = status.HackathonID
		}
		return s.audit.Record(ctx, actor, models.AuditStatusChange, models.EntityRegistrationStatus, statusID,
			map[string]any{"status": status.Status, "todo_cycle": status.TodoCycle},
			map[string]any{"status": updated.Status, "todo_cycle": updated.TodoCycle, "note": updated.Note})
	})
	if err != nil {
		return nil, err
	}

	if reconcile != uuid.Nil && s.reconciler != nil {
		if err := s.reconciler.ReconcileHackathon(ctx, reconcile); err != nil {
			logReconcileFailure(ctx, reconcile, err)
		}
	}
	return s.response(ctx, updated)
}

// BatchSet массово устанавливает статус участникам.
func (s *StatusService) BatchSet(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	req models.BatchSetStatusRequest) (*models.BatchResult, error) {
	targets, err := s.batchTargets(ctx, actor, hackathonID, req)
	if err != nil {
		return nil, err
	}

	result := &models.BatchResult{Results: make([]models.BatchItemResult, 0, len(req.ParticipantIDs))}
	for index, participantID := range req.ParticipantIDs {
		status, ok := targets[participantID]
		if !ok {
			result.Results = append(result.Results, models.BatchItemResult{
				Index: index, Key: participantID.String(), Status: "error",
				Code: "not_found", Message: "статус участника не найден",
			})
			result.Failed++
			continue
		}
		_, err := s.AdminChange(ctx, actor, status.ID, models.AdminChangeStatusRequest{Status: req.Status, Note: req.Note})
		item := models.BatchItemResult{Index: index, Key: participantID.String()}
		if err == nil {
			id := status.ID
			item.ID = &id
			item.Status = "ok"
		} else {
			var domainErr *models.DomainError
			if errors.As(err, &domainErr) {
				item.Code = domainErr.Code
				item.Message = domainErr.Message
			} else {
				item.Code = "internal_error"
				item.Message = "внутренняя ошибка"
			}
			if errors.Is(err, models.ErrConflict) {
				item.Status = "skipped"
			} else {
				item.Status = "error"
			}
		}
		result.Results = append(result.Results, item)
		countBatch(result, err)
	}
	return result, nil
}

// BatchSetPreview считает, сколько записей изменится, ничего не изменяя.
func (s *StatusService) BatchSetPreview(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	req models.BatchSetStatusRequest) (*models.PreviewResponse, error) {
	targets, err := s.batchTargets(ctx, actor, hackathonID, req)
	if err != nil {
		return nil, err
	}
	preview := &models.PreviewResponse{}
	for _, participantID := range req.ParticipantIDs {
		status, ok := targets[participantID]
		if !ok || status.Status == req.Status {
			preview.Skipped++
			continue
		}
		preview.Affected++
	}
	return preview, nil
}

// batchTargets проверяет права и собирает текущие статусы выбранных участников.
func (s *StatusService) batchTargets(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	req models.BatchSetStatusRequest) (map[uuid.UUID]*models.RegistrationStatus, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	if len(req.ParticipantIDs) == 0 {
		return nil, models.NewValidation("список участников пуст")
	}
	// Массовая установка ограничена значениями TODO и NOT_REQUIRED:
	// отметка о выполненной регистрации остаётся индивидуальной операцией.
	if req.Status != models.StatusTODO && req.Status != models.StatusNotRequired {
		return nil, models.NewValidation("массово допускаются только TODO и NOT_REQUIRED",
			models.FieldError{Field: "status", Message: "недопустимое значение"})
	}

	registration, err := s.registrations.GetByHackathon(ctx, hackathonID)
	if err != nil {
		return nil, notFoundRegistration(err)
	}

	targets := make(map[uuid.UUID]*models.RegistrationStatus, len(req.ParticipantIDs))
	for _, participantID := range req.ParticipantIDs {
		status, err := s.statuses.GetByParticipant(ctx, registration.ID, participantID)
		if errors.Is(err, models.ErrNotFound) {
			continue
		}
		if err != nil {
			return nil, err
		}
		targets[participantID] = status
	}
	return targets, nil
}

// response собирает представление статуса с данными пользователя.
func (s *StatusService) response(ctx context.Context, status *models.RegistrationStatus) (*models.RegistrationStatusResponse, error) {
	resp := &models.RegistrationStatusResponse{
		ID:                  status.ID,
		HackathonID:         status.HackathonID,
		RegistrationID:      status.RegistrationID,
		ParticipantID:       status.ParticipantID,
		Status:              status.Status,
		TodoCycle:           status.TodoCycle,
		RegisteredAt:        status.RegisteredAt,
		LastChangeSource:    status.LastChangeSource,
		LastChangedByUserID: status.LastChangedByUserID,
		Note:                status.Note,
		UpdatedAt:           status.UpdatedAt,
	}
	participant, err := s.participants.GetByID(ctx, status.ParticipantID)
	if err != nil {
		return resp, nil
	}
	user, err := s.users.GetByID(ctx, participant.UserID)
	if err != nil {
		return resp, nil
	}
	resp.User = &models.UserSummary{ID: user.ID, DisplayName: user.DisplayName, Email: user.Email, IsActive: user.IsActive}
	return resp, nil
}
