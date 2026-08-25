package services

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// StageService обслуживает этапы хакатона. Этап служит временной шкале
// и карточке и уведомлений не порождает.
type StageService struct {
	db           *repositories.DB
	stages       *repositories.StageRepository
	hackathons   *repositories.HackathonRepository
	participants *repositories.ParticipantRepository
	audit        *AuditService
}

// NewStageService создаёт сервис этапов.
func NewStageService(db *repositories.DB, stages *repositories.StageRepository,
	hackathons *repositories.HackathonRepository, participants *repositories.ParticipantRepository,
	audit *AuditService) *StageService {
	return &StageService{db: db, stages: stages, hackathons: hackathons, participants: participants, audit: audit}
}

// List возвращает этапы хакатона. Обычный пользователь видит их только для
// опубликованного хакатона, на который назначен.
func (s *StageService) List(ctx context.Context, actor models.Actor, hackathonID uuid.UUID) ([]models.Stage, error) {
	if !actor.IsAdmin {
		hackathon, err := s.hackathons.GetByID(ctx, hackathonID)
		if err != nil {
			return nil, err
		}
		if !hackathon.Published() {
			return nil, models.NewNotFound("хакатон не найден")
		}
		participant, err := s.participants.GetByHackathonUser(ctx, hackathonID, actor.UserID)
		if err != nil || !participant.Assigned() {
			return nil, models.NewNotFound("хакатон не найден")
		}
	}
	return s.stages.ListByHackathon(ctx, hackathonID)
}

// Create добавляет этап хакатона.
func (s *StageService) Create(ctx context.Context, actor models.Actor, hackathonID uuid.UUID, req models.CreateStageRequest) (*models.Stage, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	name, err := validateText("name", req.Name, 1, 120)
	if err != nil {
		return nil, err
	}
	if !req.Type.Valid() {
		return nil, models.NewValidation("некорректный тип этапа",
			models.FieldError{Field: "type", Message: "недопустимое значение"})
	}
	if !req.EndAt.After(req.StartAt) {
		return nil, models.NewValidation("окончание этапа должно быть позже начала",
			models.FieldError{Field: "end_at", Message: "должно быть позже start_at"})
	}
	url, err := optionalHTTPS("url", req.URL)
	if err != nil {
		return nil, err
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	// Пересечения этапов и выход за период хакатона допускаются: интерфейс
	// показывает предупреждение, скрытого бизнес-состояния нет.
	hackathon, err := s.hackathons.GetByID(ctx, hackathonID)
	if err != nil {
		return nil, err
	}
	if req.StartAt.Before(hackathon.StartAt) || req.EndAt.After(hackathon.EndAt) {
		slog.InfoContext(ctx, "этап выходит за период хакатона",
			"hackathon_id", hackathonID, "stage_name", name)
	}

	var created *models.Stage
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		created, err = s.stages.Create(ctx, &models.Stage{
			HackathonID: hackathonID,
			Name:        name,
			Type:        req.Type,
			StartAt:     req.StartAt.UTC(),
			EndAt:       req.EndAt.UTC(),
			Description: req.Description,
			URL:         url,
			SortOrder:   sortOrder,
		})
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStageCreate, models.EntityStage, created.ID, nil,
			map[string]any{"name": created.Name, "type": created.Type, "start_at": created.StartAt, "end_at": created.EndAt})
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

// Update изменяет этап.
func (s *StageService) Update(ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateStageRequest) (*models.Stage, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	if req.Name != nil {
		name, err := validateText("name", *req.Name, 1, 120)
		if err != nil {
			return nil, err
		}
		req.Name = &name
	}
	if req.Type != nil && !req.Type.Valid() {
		return nil, models.NewValidation("некорректный тип этапа",
			models.FieldError{Field: "type", Message: "недопустимое значение"})
	}
	if req.URL != nil && *req.URL != "" {
		url, err := validateHTTPS("url", *req.URL)
		if err != nil {
			return nil, err
		}
		req.URL = &url
	}

	var updated *models.Stage
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.stages.GetByID(ctx, id)
		if err != nil {
			return err
		}
		start := before.StartAt
		if req.StartAt != nil {
			start = req.StartAt.UTC()
		}
		end := before.EndAt
		if req.EndAt != nil {
			end = req.EndAt.UTC()
		}
		if !end.After(start) {
			return models.NewValidation("окончание этапа должно быть позже начала",
				models.FieldError{Field: "end_at", Message: "должно быть позже start_at"})
		}

		updated, err = s.stages.Update(ctx, id, req)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStageUpdate, models.EntityStage, id,
			map[string]any{"name": before.Name, "start_at": before.StartAt, "end_at": before.EndAt},
			map[string]any{"name": updated.Name, "start_at": updated.StartAt, "end_at": updated.EndAt})
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

// Delete удаляет этап.
func (s *StageService) Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	if !actor.IsAdmin {
		return models.NewForbidden("операция доступна только администратору")
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.stages.GetByID(ctx, id)
		if err != nil {
			return err
		}
		if err := s.stages.Delete(ctx, id); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditStageDelete, models.EntityStage, id,
			map[string]any{"name": before.Name, "hackathon_id": before.HackathonID}, nil)
	})
}
