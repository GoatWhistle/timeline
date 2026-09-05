package participation

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/reconcile"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type RuleService struct {
	db            *postgres.DB
	rules         *participation.Rules
	events        *event.Events
	registrations *participation.Registrations
	notifier      Notifier
	reconciler    Reconciler
	audit         *audit.AuditService
	cfg           *config.Config
}

func NewRuleService(db *postgres.DB, rules *participation.Rules, events *event.Events,
	registrations *participation.Registrations, notifier Notifier,
	reconciler Reconciler, audit *audit.AuditService, cfg *config.Config) *RuleService {
	return &RuleService{db: db, rules: rules, events: events, registrations: registrations, notifier: notifier,
		reconciler: reconciler, audit: audit, cfg: cfg}
}

func (s *RuleService) List(ctx context.Context, actor models.Actor, eventID uuid.UUID,
) ([]models.NotificationRule, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	registration, err := s.registrations.GetByEvent(ctx, eventID)
	if err != nil {
		return nil, notFoundRegistration(err)
	}
	return s.rules.ListByRegistration(ctx, registration.ID)
}

func (s *RuleService) resolveSlot(ctx context.Context, registrationID uuid.UUID, requested *int) (int, error) {
	if requested == nil {
		return s.rules.NextFreeSlot(ctx, registrationID, s.cfg.Notify.MaxRulesPerReg)
	}
	slot := *requested
	if slot < 1 || slot > s.cfg.Notify.MaxRulesPerReg {
		return 0, models.NewValidation("invalid slot number",
			models.FieldError{
				Field:   "slot_no",
				Message: "allowed values range from 1 to " + validation.Itoa(s.cfg.Notify.MaxRulesPerReg),
			})
	}
	return slot, nil
}

func (s *RuleService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req dto.CreateRuleRequest) (*models.NotificationRule, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if err := s.validateOffset(req.OffsetMinutes); err != nil {
		return nil, err
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	var created *models.NotificationRule
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		registration, err := s.registrations.GetByEventForUpdate(ctx, eventID)
		if err != nil {
			return notFoundRegistration(err)
		}

		slot, err := s.resolveSlot(ctx, registration.ID, req.SlotNo)
		if err != nil {
			return err
		}

		created, err = s.rules.Create(ctx, &models.NotificationRule{
			RegistrationID: registration.ID,
			OffsetMinutes:  req.OffsetMinutes,
			Enabled:        enabled,
			SlotNo:         slot,
		})
		if err != nil {
			return err
		}

		if err := s.resetSchedule(ctx, registration.ID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditRuleChange, models.EntityNotificationRule, created.ID, nil,
			map[string]any{
				"offset_minutes": created.OffsetMinutes,
				"slot_no":        created.SlotNo,
				"enabled":        created.Enabled,
			})
	})
	if err != nil {
		return nil, err
	}

	s.reconcile(ctx, eventID)
	return created, nil
}

func ruleScheduleChanged(req dto.UpdateRuleRequest, before *models.NotificationRule) bool {
	return (req.OffsetMinutes != nil && *req.OffsetMinutes != before.OffsetMinutes) ||
		(req.Enabled != nil && *req.Enabled != before.Enabled)
}

func ruleAuditState(rule *models.NotificationRule) map[string]any {
	return map[string]any{
		"offset_minutes": rule.OffsetMinutes,
		"enabled":        rule.Enabled,
	}
}

func (s *RuleService) resetSchedule(ctx context.Context, registrationID uuid.UUID) error {
	if _, err := s.registrations.BumpScheduleVersion(ctx, registrationID); err != nil {
		return err
	}
	return s.notifier.CancelForRegistration(ctx, registrationID)
}

func (s *RuleService) Update(ctx context.Context, actor models.Actor, ruleID uuid.UUID,
	req dto.UpdateRuleRequest) (*models.NotificationRule, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if req.OffsetMinutes != nil {
		if err := s.validateOffset(*req.OffsetMinutes); err != nil {
			return nil, err
		}
	}

	var (
		updated *models.NotificationRule
		eventID uuid.UUID
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.rules.GetByID(ctx, ruleID)
		if err != nil {
			return err
		}
		reg, err := s.registrations.GetByID(ctx, before.RegistrationID)
		if err != nil {
			return err
		}
		eventID = reg.EventID

		updated, err = s.rules.Update(ctx, ruleID, req.OffsetMinutes, req.Enabled)
		if err != nil {
			return err
		}

		if ruleScheduleChanged(req, before) {
			if err := s.resetSchedule(ctx, reg.ID); err != nil {
				return err
			}
		}
		return s.audit.Record(ctx, actor, models.AuditRuleChange, models.EntityNotificationRule, ruleID,
			ruleAuditState(before), ruleAuditState(updated))
	})
	if err != nil {
		return nil, err
	}

	s.reconcile(ctx, eventID)
	return updated, nil
}

func (s *RuleService) Disable(ctx context.Context, actor models.Actor, ruleID uuid.UUID) error {
	if !actor.IsAdmin {
		return models.NewForbidden("the operation is restricted to administrators")
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.rules.GetByID(ctx, ruleID)
		if err != nil {
			return err
		}
		if !before.Enabled {
			return models.NewConflict("already_disabled", "the rule is already disabled")
		}
		if err := s.rules.Disable(ctx, ruleID); err != nil {
			return err
		}
		if _, err := s.registrations.BumpScheduleVersion(ctx, before.RegistrationID); err != nil {
			return err
		}
		if err := s.notifier.CancelForRegistration(ctx, before.RegistrationID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditRuleChange, models.EntityNotificationRule, ruleID,
			map[string]any{"enabled": true}, map[string]any{"enabled": false})
	})
}

func (s *RuleService) validateOffset(offset int) error {
	limit := s.cfg.Notify.MaxOffsetMinutes
	if offset < -limit || offset > limit {
		return models.NewValidation("offset is out of the allowed range",
			models.FieldError{Field: "offset_minutes",
				Message: "allowed range is " + validation.Itoa(limit) + " minutes"})
	}
	return nil
}

func (s *RuleService) reconcile(ctx context.Context, eventID uuid.UUID) {
	if s.reconciler == nil || eventID == uuid.Nil {
		return
	}
	if err := s.reconciler.ReconcileEvent(ctx, eventID); err != nil {
		reconcile.LogReconcileFailure(ctx, eventID, err)
	}
}
