package services

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/repositories"
	"github.com/GoatWhistle/timeline/internal/models"
)

type RegistrationService struct {
	db            *repositories.DB
	registrations *repositories.RegistrationRepository
	events        *repositories.EventRepository
	participants  *repositories.ParticipantRepository
	statuses      *repositories.StatusRepository
	users         *repositories.UserRepository
	notifier      *NotificationService
	reconciler    Reconciler
	audit         *AuditService
}

func NewRegistrationService(db *repositories.DB, registrations *repositories.RegistrationRepository,
	events *repositories.EventRepository, participants *repositories.ParticipantRepository,
	statuses *repositories.StatusRepository, users *repositories.UserRepository,
	notifier *NotificationService, reconciler Reconciler, audit *AuditService) *RegistrationService {
	return &RegistrationService{
		db: db, registrations: registrations, events: events, participants: participants,
		statuses: statuses, users: users, notifier: notifier, reconciler: reconciler, audit: audit,
	}
}

func (s *RegistrationService) Get(ctx context.Context, actor models.Actor, eventID uuid.UUID) (*models.Registration, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	return s.registrations.GetByEvent(ctx, eventID)
}

func (s *RegistrationService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.CreateRegistrationRequest) (*models.Registration, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	url, err := validateHTTPS("url", req.URL)
	if err != nil {
		return nil, err
	}
	if req.DeadlineAt.IsZero() {
		return nil, models.NewValidation("provide a registration deadline",
			models.FieldError{Field: "deadline_at", Message: "required field"})
	}

	var created *models.Registration
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		event, err := s.events.GetForUpdate(ctx, eventID)
		if err != nil {
			return err
		}
		if event.Archived() {
			return models.NewStateTransition("registration cannot be created for an archived event")
		}
		if req.DeadlineAt.After(event.EndAt) {
			return models.NewConflict("deadline_after_end",
				"the registration deadline must not be later than the event end")
		}

		created, err = s.registrations.Create(ctx, eventID, url, req.DeadlineAt.UTC(), req.Description)
		if err != nil {
			return err
		}
		if err := s.seedStatuses(ctx, event, created); err != nil {
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

func (s *RegistrationService) seedStatuses(ctx context.Context, event *models.Event, registration *models.Registration) error {
	participants, err := s.participants.ListAssigned(ctx, event.ID)
	if err != nil {
		return err
	}
	for i := range participants {
		participant := participants[i]
		status, _, err := s.statuses.EnsureForParticipant(ctx, event.ID, registration.ID, participant.ID)
		if err != nil {
			return err
		}
		if status.Status != models.StatusTODO || !event.Schedulable() || !registration.Active() {
			continue
		}
		user, err := s.users.GetByID(ctx, participant.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			continue
		}
		candidate := buildCandidate(event, registration, &participant, status.ID, status.TodoCycle, user)
		if _, _, err := s.notifier.CreatePrimary(ctx, candidate); err != nil {
			return err
		}
	}
	return nil
}

func (s *RegistrationService) Update(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.UpdateRegistrationRequest) (*models.Registration, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
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
		before, err := s.registrations.GetByEventForUpdate(ctx, eventID)
		if err != nil {
			return err
		}
		event, err := s.events.GetByID(ctx, eventID)
		if err != nil {
			return err
		}
		if event.Archived() {
			return models.NewStateTransition("registration of an archived event cannot be modified")
		}

		var deadline *time.Time
		bumpSchedule := false
		if req.DeadlineAt != nil && !req.DeadlineAt.UTC().Equal(before.DeadlineAt) {
			value := req.DeadlineAt.UTC()
			if value.After(event.EndAt) {
				return models.NewConflict("deadline_after_end",
					"the registration deadline must not be later than the event end")
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
		s.reconcile(ctx, eventID)
	}
	return updated, nil
}

func (s *RegistrationService) SetState(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	state models.RegistrationState) (*models.Registration, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}

	var (
		updated   *models.Registration
		reconcile bool
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.registrations.GetByEventForUpdate(ctx, eventID)
		if err != nil {
			return err
		}
		if before.State == state {
			return models.NewStateTransition("registration is already in this state")
		}
		event, err := s.events.GetByID(ctx, eventID)
		if err != nil {
			return err
		}
		if event.Archived() {
			return models.NewStateTransition("registration of an archived event cannot be modified")
		}

		if state == models.RegistrationDisabled {
			updated, err = s.registrations.Disable(ctx, before.ID)
			if err != nil {
				return err
			}
			if err := s.notifier.CancelForRegistration(ctx, before.ID); err != nil {
				return err
			}
		} else {
			updated, err = s.registrations.Activate(ctx, before.ID)
			if err != nil {
				return err
			}
			if err := s.seedStatuses(ctx, event, updated); err != nil {
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
		s.reconcile(ctx, eventID)
	}
	return updated, nil
}

func (s *RegistrationService) reconcile(ctx context.Context, eventID uuid.UUID) {
	if s.reconciler == nil {
		return
	}
	if err := s.reconciler.ReconcileEvent(ctx, eventID); err != nil {
		logReconcileFailure(ctx, eventID, err)
	}
}

func notFoundRegistration(err error) error {
	if errors.Is(err, models.ErrNotFound) {
		return models.NewNotFound("event registration is not configured")
	}
	return err
}
