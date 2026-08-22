package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/adapters/repositories"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// RegistrationService обслуживает регистрацию хакатона и её версии.
type RegistrationService struct {
	db            *repositories.DB
	registrations *repositories.RegistrationRepository
	hackathons    *repositories.HackathonRepository
	participants  *repositories.ParticipantRepository
	statuses      *repositories.StatusRepository
	users         *repositories.UserRepository
	notifier      *NotificationService
	reconciler    Reconciler
	audit         *AuditService
}

// NewRegistrationService создаёт сервис регистрации.
func NewRegistrationService(db *repositories.DB, registrations *repositories.RegistrationRepository,
	hackathons *repositories.HackathonRepository, participants *repositories.ParticipantRepository,
	statuses *repositories.StatusRepository, users *repositories.UserRepository,
	notifier *NotificationService, reconciler Reconciler, audit *AuditService) *RegistrationService {
	return &RegistrationService{
		db: db, registrations: registrations, hackathons: hackathons, participants: participants,
		statuses: statuses, users: users, notifier: notifier, reconciler: reconciler, audit: audit,
	}
}

// Get возвращает регистрацию хакатона.
func (s *RegistrationService) Get(ctx context.Context, actor models.Actor, hackathonID uuid.UUID) (*models.Registration, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	return s.registrations.GetByHackathon(ctx, hackathonID)
}

// Create создаёт регистрацию и статусы TODO всем назначенным участникам.
func (s *RegistrationService) Create(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	req models.CreateRegistrationRequest) (*models.Registration, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	url, err := validateHTTPS("url", req.URL)
	if err != nil {
		return nil, err
	}
	if req.DeadlineAt.IsZero() {
		return nil, models.NewValidation("укажите дедлайн регистрации",
			models.FieldError{Field: "deadline_at", Message: "обязательное поле"})
	}

	var created *models.Registration
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		hackathon, err := s.hackathons.GetForUpdate(ctx, hackathonID)
		if err != nil {
			return err
		}
		if hackathon.Archived() {
			return models.NewStateTransition("нельзя создать регистрацию архивного хакатона")
		}
		// Дедлайн раньше старта допустим: внешняя регистрация обычно закрывается
		// до начала хакатона. Верхняя граница проверяется базой.
		if req.DeadlineAt.After(hackathon.EndAt) {
			return models.NewConflict("deadline_after_end",
				"дедлайн регистрации должен быть не позже окончания хакатона")
		}

		created, err = s.registrations.Create(ctx, hackathonID, url, req.DeadlineAt.UTC(), req.Description)
		if err != nil {
			return err
		}
		if err := s.seedStatuses(ctx, hackathon, created); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditRegistrationChange, models.EntityRegistration, created.ID, nil,
			map[string]any{"url": created.URL, "deadline_at": created.DeadlineAt, "state": created.State})
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

// seedStatuses создаёт недостающие статусы TODO и первичные уведомления
// всем назначенным участникам хакатона.
func (s *RegistrationService) seedStatuses(ctx context.Context, hackathon *models.Hackathon, registration *models.Registration) error {
	participants, err := s.participants.ListAssigned(ctx, hackathon.ID)
	if err != nil {
		return err
	}
	for i := range participants {
		participant := participants[i]
		status, _, err := s.statuses.EnsureForParticipant(ctx, hackathon.ID, registration.ID, participant.ID)
		if err != nil {
			return err
		}
		if status.Status != models.StatusTODO || !hackathon.Schedulable() || !registration.Active() {
			continue
		}
		user, err := s.users.GetByID(ctx, participant.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			continue
		}
		candidate := buildCandidate(hackathon, registration, &participant, status.ID, status.TodoCycle, user)
		if _, _, err := s.notifier.CreatePrimary(ctx, candidate); err != nil {
			return err
		}
	}
	return nil
}

// Update изменяет регистрацию. Изменение ссылки версионирует содержимое,
// изменение дедлайна — расписание; в обоих случаях ожидающие уведомления
// отменяются, а актуальные создаёт согласование.
func (s *RegistrationService) Update(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	req models.UpdateRegistrationRequest) (*models.Registration, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}
	var url *string
	if req.URL != nil {
		value, err := validateHTTPS("url", *req.URL)
		if err != nil {
			return nil, err
		}
		url = &value
	}

	var (
		updated   *models.Registration
		reconcile bool
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.registrations.GetByHackathonForUpdate(ctx, hackathonID)
		if err != nil {
			return err
		}
		hackathon, err := s.hackathons.GetByID(ctx, hackathonID)
		if err != nil {
			return err
		}
		if hackathon.Archived() {
			return models.NewStateTransition("нельзя изменить регистрацию архивного хакатона")
		}

		var deadline *time.Time
		bumpSchedule := false
		if req.DeadlineAt != nil && !req.DeadlineAt.UTC().Equal(before.DeadlineAt) {
			value := req.DeadlineAt.UTC()
			if value.After(hackathon.EndAt) {
				return models.NewConflict("deadline_after_end",
					"дедлайн регистрации должен быть не позже окончания хакатона")
			}
			deadline = &value
			bumpSchedule = true
		}
		bumpContent := url != nil && *url != before.URL

		if !bumpSchedule && !bumpContent && req.Description == nil {
			updated = before
			return nil
		}

		updated, err = s.registrations.Update(ctx, before.ID, url, deadline, req.Description, bumpSchedule, bumpContent)
		if err != nil {
			return err
		}
		if bumpSchedule || bumpContent {
			if err := s.notifier.CancelForRegistration(ctx, before.ID); err != nil {
				return err
			}
			reconcile = true
		}
		return s.audit.Record(ctx, actor, models.AuditRegistrationChange, models.EntityRegistration, before.ID,
			map[string]any{"url": before.URL, "deadline_at": before.DeadlineAt,
				"schedule_version": before.ScheduleVersion, "content_version": before.NotificationContentVersion},
			map[string]any{"url": updated.URL, "deadline_at": updated.DeadlineAt,
				"schedule_version": updated.ScheduleVersion, "content_version": updated.NotificationContentVersion})
	})
	if err != nil {
		return nil, err
	}

	if reconcile {
		s.reconcile(ctx, hackathonID)
	}
	return updated, nil
}

// SetState включает или выключает регистрацию.
func (s *RegistrationService) SetState(ctx context.Context, actor models.Actor, hackathonID uuid.UUID,
	state models.RegistrationState) (*models.Registration, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("операция доступна только администратору")
	}

	var (
		updated   *models.Registration
		reconcile bool
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.registrations.GetByHackathonForUpdate(ctx, hackathonID)
		if err != nil {
			return err
		}
		if before.State == state {
			return models.NewStateTransition("регистрация уже находится в этом состоянии")
		}
		hackathon, err := s.hackathons.GetByID(ctx, hackathonID)
		if err != nil {
			return err
		}
		if hackathon.Archived() {
			return models.NewStateTransition("нельзя изменить регистрацию архивного хакатона")
		}

		if state == models.RegistrationDisabled {
			updated, err = s.registrations.Disable(ctx, before.ID)
			if err != nil {
				return err
			}
			// Статусы сохраняются, но перестают быть actionable.
			if err := s.notifier.CancelForRegistration(ctx, before.ID); err != nil {
				return err
			}
		} else {
			updated, err = s.registrations.Activate(ctx, before.ID)
			if err != nil {
				return err
			}
			if err := s.seedStatuses(ctx, hackathon, updated); err != nil {
				return err
			}
			reconcile = true
		}

		return s.audit.Record(ctx, actor, models.AuditRegistrationChange, models.EntityRegistration, before.ID,
			map[string]any{"state": before.State, "activation_version": before.ActivationVersion},
			map[string]any{"state": updated.State, "activation_version": updated.ActivationVersion})
	})
	if err != nil {
		return nil, err
	}

	if reconcile {
		s.reconcile(ctx, hackathonID)
	}
	return updated, nil
}

func (s *RegistrationService) reconcile(ctx context.Context, hackathonID uuid.UUID) {
	if s.reconciler == nil {
		return
	}
	if err := s.reconciler.ReconcileHackathon(ctx, hackathonID); err != nil {
		logReconcileFailure(ctx, hackathonID, err)
	}
}

// notFound приводит отсутствие регистрации к понятной доменной ошибке.
func notFoundRegistration(err error) error {
	if errors.Is(err, models.ErrNotFound) {
		return models.NewNotFound("регистрация хакатона не настроена")
	}
	return err
}
