package services

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// ParticipantService обслуживает состав участников хакатона.
type ParticipantService struct {
	db            *repositories.DB
	participants  *repositories.ParticipantRepository
	hackathons    *repositories.HackathonRepository
	registrations *repositories.RegistrationRepository
	statuses      *repositories.StatusRepository
	users         *repositories.UserRepository
	notifier      *NotificationService
	audit         *AuditService
}

// NewParticipantService создаёт сервис участников.
func NewParticipantService(db *repositories.DB, participants *repositories.ParticipantRepository,
	hackathons *repositories.HackathonRepository, registrations *repositories.RegistrationRepository,
	statuses *repositories.StatusRepository, users *repositories.UserRepository,
	notifier *NotificationService, audit *AuditService) *ParticipantService {
	return &ParticipantService{
		db: db, participants: participants, hackathons: hackathons, registrations: registrations,
		statuses: statuses, users: users, notifier: notifier, audit: audit,
	}
}

// List возвращает страницу состава участников.
func (s *ParticipantService) List(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	filter models.ParticipantFilter, page models.Page) ([]models.ParticipantResponse, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("состав участников доступен только администратору")
	}
	return s.participants.List(ctx, hackathonID, filter, page)
}

// AddMany добавляет участников пакетом. Каждый элемент обрабатывается
// собственной транзакцией, поэтому конфликт одного не отменяет остальные.
func (s *ParticipantService) AddMany(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	req models.AddParticipantsRequest) (*models.BatchResult, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	if len(req.Items) == 0 {
		return nil, models.NewValidation("список участников пуст")
	}
	if _, err := s.hackathons.GetByID(ctx, hackathonID); err != nil {
		return nil, err
	}

	result := &models.BatchResult{Results: make([]models.BatchItemResult, 0, len(req.Items))}
	for index, item := range req.Items {
		participant, err := s.addOne(ctx, actor, hackathonID, item)
		result.Results = append(result.Results, batchItem(index, item.UserID.String(), participant, err))
		countBatch(result, err)
	}
	return result, nil
}

// addOne выполняет назначение одного участника: запись участия, статус
// регистрации, первичное уведомление и запись аудита — одной транзакцией.
func (s *ParticipantService) addOne(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	item models.AddParticipantItem) (*models.HackathonParticipant, error) {
	teamRole, err := validateText("team_role", item.TeamRole, 1, 80)
	if err != nil {
		return nil, err
	}

	var participant *models.HackathonParticipant
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		user, err := s.users.GetByID(ctx, item.UserID)
		if err != nil {
			return models.NewNotFound("пользователь не найден")
		}
		if !user.IsActive {
			return models.NewConflict("user_inactive", "нельзя назначить деактивированного пользователя")
		}

		existing, err := s.participants.GetByHackathonUser(ctx, hackathonID, item.UserID)
		switch {
		case err == nil && existing.Assigned():
			return models.NewConflict("already_assigned", "участник уже назначен на хакатон")
		case err == nil:
			// Повторное добавление реактивирует существующую запись.
			participant, err = s.participants.Reactivate(ctx, existing.ID, teamRole)
			if err != nil {
				return err
			}
			if err := s.audit.Record(ctx, actor, models.AuditParticipantReactive, models.EntityParticipant,
				participant.ID, map[string]any{"participation_status": models.ParticipationRemoved},
				map[string]any{"participation_status": models.ParticipationAssigned, "team_role": teamRole}); err != nil {
				return err
			}
		case errors.Is(err, models.ErrNotFound):
			participant, err = s.participants.Create(ctx, hackathonID, item.UserID, teamRole)
			if err != nil {
				return err
			}
			if err := s.audit.Record(ctx, actor, models.AuditParticipantAdd, models.EntityParticipant,
				participant.ID, nil, map[string]any{"user_id": item.UserID, "team_role": teamRole}); err != nil {
				return err
			}
		default:
			return err
		}

		return s.ensureStatusAndNotification(ctx, hackathonID, participant, user)
	})
	if err != nil {
		return nil, err
	}
	return participant, nil
}

// ensureStatusAndNotification создаёт недостающий статус TODO и, если хакатон
// опубликован и не архивирован, первичное уведомление. Для неопубликованного
// хакатона уведомление откладывается до публикации.
func (s *ParticipantService) ensureStatusAndNotification(ctx context.Context, hackathonID uuid.UUID,
	participant *models.HackathonParticipant, user *models.User) error {
	registration, err := s.registrations.GetByHackathon(ctx, hackathonID)
	if errors.Is(err, models.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if !registration.Active() {
		return nil
	}

	status, _, err := s.statuses.EnsureForParticipant(ctx, hackathonID, registration.ID, participant.ID)
	if err != nil {
		return err
	}
	if status.Status != models.StatusTODO {
		// Ранее проставленные DONE и NOT_REQUIRED автоматически не сбрасываются.
		return nil
	}

	hackathon, err := s.hackathons.GetByID(ctx, hackathonID)
	if err != nil {
		return err
	}
	if !hackathon.Schedulable() {
		return nil
	}

	candidate := buildCandidate(hackathon, registration, participant, status.ID, status.TodoCycle, user)
	_, _, err = s.notifier.CreatePrimary(ctx, candidate)
	return err
}

// RemoveMany удаляет участников пакетом.
func (s *ParticipantService) RemoveMany(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	req models.RemoveParticipantsRequest) (*models.BatchResult, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	if len(req.ParticipantIDs) == 0 {
		return nil, models.NewValidation("список участников пуст")
	}

	result := &models.BatchResult{Results: make([]models.BatchItemResult, 0, len(req.ParticipantIDs))}
	for index, id := range req.ParticipantIDs {
		var participant *models.HackathonParticipant
		err := s.db.WithTx(ctx, func(ctx context.Context) error {
			existing, err := s.participants.GetForUpdate(ctx, id)
			if err != nil {
				return err
			}
			if existing.HackathonID != hackathonID {
				return models.NewNotFound("участник не найден на этом хакатоне")
			}
			if !existing.Assigned() {
				return models.NewConflict("already_removed", "участник уже удалён из состава")
			}
			participant, err = s.participants.Remove(ctx, id)
			if err != nil {
				return err
			}
			// Удаление блокирует новые доставки; уже отправленные сохраняются.
			if err := s.notifier.CancelForParticipant(ctx, id); err != nil {
				return err
			}
			return s.audit.Record(ctx, actor, models.AuditParticipantRemove, models.EntityParticipant, id,
				map[string]any{"participation_status": models.ParticipationAssigned},
				map[string]any{"participation_status": models.ParticipationRemoved})
		})
		result.Results = append(result.Results, batchItem(index, id.String(), participant, err))
		countBatch(result, err)
	}
	return result, nil
}

// UpdateTeamRole меняет функцию участника на хакатоне.
func (s *ParticipantService) UpdateTeamRole(ctx context.Context, actor models.Actor, participantID uuid.UUID,
	role string) (*models.ParticipantResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	teamRole, err := validateText("team_role", role, 1, 80)
	if err != nil {
		return nil, err
	}

	var updated *models.HackathonParticipant
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.participants.GetForUpdate(ctx, participantID)
		if err != nil {
			return err
		}
		updated, err = s.participants.UpdateTeamRole(ctx, participantID, teamRole)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamRoleChange, models.EntityParticipant, participantID,
			map[string]any{"team_role": before.TeamRole}, map[string]any{"team_role": updated.TeamRole})
	})
	if err != nil {
		return nil, err
	}
	return s.response(ctx, updated)
}

// Reactivate возвращает удалённого участника в состав.
func (s *ParticipantService) Reactivate(ctx context.Context, actor models.Actor, participantID uuid.UUID,
	role string) (*models.ParticipantResponse, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	teamRole, err := validateText("team_role", role, 1, 80)
	if err != nil {
		return nil, err
	}

	var participant *models.HackathonParticipant
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		existing, err := s.participants.GetForUpdate(ctx, participantID)
		if err != nil {
			return err
		}
		if existing.Assigned() {
			return models.NewConflict("already_assigned", "участник уже назначен")
		}
		user, err := s.users.GetByID(ctx, existing.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			return models.NewConflict("user_inactive", "нельзя вернуть деактивированного пользователя")
		}

		participant, err = s.participants.Reactivate(ctx, participantID, teamRole)
		if err != nil {
			return err
		}
		if err := s.audit.Record(ctx, actor, models.AuditParticipantReactive, models.EntityParticipant,
			participantID, map[string]any{"participation_status": models.ParticipationRemoved},
			map[string]any{"participation_status": models.ParticipationAssigned, "team_role": teamRole}); err != nil {
			return err
		}
		return s.ensureStatusAndNotification(ctx, existing.HackathonID, participant, user)
	})
	if err != nil {
		return nil, err
	}
	return s.response(ctx, participant)
}

// CopyFrom переносит назначенный состав другого хакатона.
// Функция участника переносится как значение по умолчанию.
func (s *ParticipantService) CopyFrom(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	req models.CopyParticipantsRequest) (*models.BatchResult, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	if req.SourceHackathonID == hackathonID {
		return nil, models.NewValidation("исходный и целевой хакатоны совпадают")
	}
	if _, err := s.hackathons.GetByID(ctx, req.SourceHackathonID); err != nil {
		return nil, models.NewNotFound("исходный хакатон не найден")
	}
	if _, err := s.hackathons.GetByID(ctx, hackathonID); err != nil {
		return nil, err
	}

	source, err := s.participants.ListAssigned(ctx, req.SourceHackathonID)
	if err != nil {
		return nil, err
	}
	overrides := make(map[uuid.UUID]string, len(req.Overrides))
	for _, o := range req.Overrides {
		overrides[o.UserID] = o.TeamRole
	}

	items := make([]models.AddParticipantItem, 0, len(source))
	for _, p := range source {
		role := p.TeamRole
		if custom, ok := overrides[p.UserID]; ok {
			role = custom
		}
		items = append(items, models.AddParticipantItem{UserID: p.UserID, TeamRole: role})
	}
	if len(items) == 0 {
		return &models.BatchResult{Results: []models.BatchItemResult{}}, nil
	}
	return s.AddMany(ctx, actor, hackathonID, models.AddParticipantsRequest{Items: items})
}

// response собирает представление участника с данными пользователя и статусом.
func (s *ParticipantService) response(ctx context.Context, p *models.HackathonParticipant) (*models.ParticipantResponse, error) {
	user, err := s.users.GetByID(ctx, p.UserID)
	if err != nil {
		return nil, err
	}
	resp := &models.ParticipantResponse{
		ID:                  p.ID,
		HackathonID:         p.HackathonID,
		User:                models.UserSummary{ID: user.ID, DisplayName: user.DisplayName, Email: user.Email, IsActive: user.IsActive},
		TeamRole:            p.TeamRole,
		ParticipationStatus: p.ParticipationStatus,
		AssignmentVersion:   p.AssignmentVersion,
		AssignedAt:          p.AssignedAt,
		RemovedAt:           p.RemovedAt,
	}

	registration, err := s.registrations.GetByHackathon(ctx, p.HackathonID)
	if errors.Is(err, models.ErrNotFound) {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	status, err := s.statuses.GetByParticipant(ctx, registration.ID, p.ID)
	if errors.Is(err, models.ErrNotFound) {
		return resp, nil
	}
	if err != nil {
		return nil, err
	}
	resp.RegistrationStatus = &models.RegistrationStatusShort{
		ID: status.ID, Status: status.Status, TodoCycle: status.TodoCycle,
		RegisteredAt: status.RegisteredAt, Note: status.Note,
	}
	return resp, nil
}

// batchItem собирает результат обработки одного элемента пакетной операции.
func batchItem(index int, key string, participant *models.HackathonParticipant, err error) models.BatchItemResult {
	item := models.BatchItemResult{Index: index, Key: key}
	if err == nil {
		item.Status = "ok"
		if participant != nil {
			id := participant.ID
			item.ID = &id
		}
		return item
	}

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
	return item
}

// countBatch обновляет счётчики результата пакетной операции.
func countBatch(result *models.BatchResult, err error) {
	switch {
	case err == nil:
		result.Succeeded++
	case errors.Is(err, models.ErrConflict):
		result.Skipped++
	default:
		result.Failed++
	}
}
