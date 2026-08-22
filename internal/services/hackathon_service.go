package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// Reconciler создаёт недостающие уведомления для хакатона.
// Реализуется планировщиком; сервисы вызывают его после изменений,
// которые открывают путь новым уведомлениям.
type Reconciler interface {
	ReconcileHackathon(ctx context.Context, hackathonID uuid.UUID) error
}

// HackathonService обслуживает хакатоны и их жизненный цикл.
type HackathonService struct {
	db            *repositories.DB
	hackathons    *repositories.HackathonRepository
	registrations *repositories.RegistrationRepository
	notifier      *NotificationService
	reconciler    Reconciler
	audit         *AuditService
	now           func() time.Time
}

// NewHackathonService создаёт сервис хакатонов.
func NewHackathonService(db *repositories.DB, hackathons *repositories.HackathonRepository,
	registrations *repositories.RegistrationRepository, notifier *NotificationService,
	reconciler Reconciler, audit *AuditService) *HackathonService {
	return &HackathonService{
		db: db, hackathons: hackathons, registrations: registrations, notifier: notifier,
		reconciler: reconciler, audit: audit, now: func() time.Time { return time.Now().UTC() },
	}
}

// Create создаёт неопубликованный хакатон.
func (s *HackathonService) Create(ctx context.Context, actor models.Actor, req models.CreateHackathonRequest) (*models.Hackathon, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("создание хакатона доступно только администратору")
	}
	title, err := validateText("title", req.Title, 1, 200)
	if err != nil {
		return nil, err
	}
	if !req.EndAt.After(req.StartAt) {
		return nil, models.NewValidation("окончание хакатона должно быть позже начала",
			models.FieldError{Field: "end_at", Message: "должно быть позже start_at"})
	}
	website, err := optionalHTTPS("website_url", req.WebsiteURL)
	if err != nil {
		return nil, err
	}

	var created *models.Hackathon
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		created, err = s.hackathons.Create(ctx, &models.Hackathon{
			Title:       title,
			Description: req.Description,
			Organizer:   req.Organizer,
			WebsiteURL:  website,
			Notes:       req.Notes,
			StartAt:     req.StartAt.UTC(),
			EndAt:       req.EndAt.UTC(),
		})
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditHackathonCreate, models.EntityHackathon, created.ID, nil,
			map[string]any{"title": created.Title, "start_at": created.StartAt, "end_at": created.EndAt})
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

// Get возвращает хакатон целиком; операция административная.
func (s *HackathonService) Get(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Hackathon, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	return s.hackathons.GetByID(ctx, id)
}

// List возвращает страницу административного списка хакатонов.
func (s *HackathonService) List(ctx context.Context, actor models.Actor, filter models.HackathonFilter,
	page models.Page) ([]models.Hackathon, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("операция доступна только администратору")
	}
	return s.hackathons.List(ctx, filter, page, s.now())
}

// Update изменяет хакатон. Перенос окончания увеличивает версию расписания
// регистрации, отменяет устаревшие ожидающие уведомления и запускает согласование.
func (s *HackathonService) Update(ctx context.Context, actor models.Actor, id uuid.UUID, req models.UpdateHackathonRequest) (*models.Hackathon, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("изменение хакатона доступно только администратору")
	}
	if req.Title != nil {
		title, err := validateText("title", *req.Title, 1, 200)
		if err != nil {
			return nil, err
		}
		req.Title = &title
	}
	if req.WebsiteURL != nil && *req.WebsiteURL != "" {
		website, err := validateHTTPS("website_url", *req.WebsiteURL)
		if err != nil {
			return nil, err
		}
		req.WebsiteURL = &website
	}

	var (
		updated       *models.Hackathon
		scheduleReset bool
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.hackathons.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if before.Archived() {
			return models.NewStateTransition("архивный хакатон не изменяется")
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
			return models.NewValidation("окончание хакатона должно быть позже начала",
				models.FieldError{Field: "end_at", Message: "должно быть позже start_at"})
		}

		updated, err = s.hackathons.Update(ctx, id, req)
		if err != nil {
			return err
		}

		// Окончание ограничивает окно правил просрочки, поэтому его перенос
		// версионирует расписание регистрации и отменяет устаревшие записи.
		if !updated.EndAt.Equal(before.EndAt) {
			registration, err := s.registrations.GetByHackathonForUpdate(ctx, id)
			switch {
			case err == nil:
				if _, err := s.registrations.BumpScheduleVersion(ctx, registration.ID); err != nil {
					return err
				}
				if err := s.notifier.CancelForRegistration(ctx, registration.ID); err != nil {
					return err
				}
				scheduleReset = true
			case errors.Is(err, models.ErrNotFound):
			default:
				return err
			}
		}

		return s.audit.Record(ctx, actor, models.AuditHackathonUpdate, models.EntityHackathon, id,
			map[string]any{"title": before.Title, "start_at": before.StartAt, "end_at": before.EndAt},
			map[string]any{"title": updated.Title, "start_at": updated.StartAt, "end_at": updated.EndAt})
	})
	if err != nil {
		return nil, err
	}

	if scheduleReset {
		s.reconcile(ctx, id)
	}
	return updated, nil
}

// Publish публикует хакатон и создаёт отложенные первичные уведомления.
func (s *HackathonService) Publish(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Hackathon, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("публикация доступна только администратору")
	}
	var published *models.Hackathon
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.hackathons.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if before.Archived() {
			return models.NewStateTransition("архивный хакатон нельзя опубликовать")
		}
		if before.Published() {
			return models.NewStateTransition("хакатон уже опубликован")
		}
		published, err = s.hackathons.Publish(ctx, id, s.now())
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditHackathonPublish, models.EntityHackathon, id,
			map[string]any{"published_at": nil}, map[string]any{"published_at": published.PublishedAt})
	})
	if err != nil {
		return nil, err
	}

	s.reconcile(ctx, id)
	return published, nil
}

// Archive архивирует хакатон и отменяет ожидающие уведомления.
func (s *HackathonService) Archive(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Hackathon, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("архивирование доступно только администратору")
	}
	var archived *models.Hackathon
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.hackathons.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if before.Archived() {
			return models.NewStateTransition("хакатон уже архивирован")
		}
		archived, err = s.hackathons.Archive(ctx, id, s.now())
		if err != nil {
			return err
		}
		if err := s.notifier.CancelForHackathon(ctx, id); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditHackathonArchive, models.EntityHackathon, id,
			map[string]any{"archived_at": nil}, map[string]any{"archived_at": archived.ArchivedAt})
	})
	if err != nil {
		return nil, err
	}
	return archived, nil
}

// reconcile запускает согласование уведомлений хакатона. Ошибка не отменяет
// уже зафиксированную доменную операцию: планировщик повторит согласование.
func (s *HackathonService) reconcile(ctx context.Context, hackathonID uuid.UUID) {
	if s.reconciler == nil {
		return
	}
	if err := s.reconciler.ReconcileHackathon(ctx, hackathonID); err != nil {
		logReconcileFailure(ctx, hackathonID, err)
	}
}

func optionalHTTPS(field string, value *string) (*string, error) {
	if value == nil || *value == "" {
		return nil, nil
	}
	normalized, err := validateHTTPS(field, *value)
	if err != nil {
		return nil, err
	}
	return &normalized, nil
}
