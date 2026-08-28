package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

type RuleService struct {
	db            *postgres.DB
	rules         *participation.Rules
	registrations *participation.Registrations
	notifier      *NotificationService
	reconciler    Reconciler
	audit         *AuditService
	cfg           *config.Config
}

func NewRuleService(db *postgres.DB, rules *participation.Rules,
	registrations *participation.Registrations, notifier *NotificationService,
	reconciler Reconciler, audit *AuditService, cfg *config.Config) *RuleService {
	return &RuleService{db: db, rules: rules, registrations: registrations, notifier: notifier,
		reconciler: reconciler, audit: audit, cfg: cfg}
}

func (s *RuleService) List(ctx context.Context, actor models.Actor, eventID uuid.UUID) ([]models.NotificationRule, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	registration, err := s.registrations.GetByEvent(ctx, eventID)
	if err != nil {
		return nil, notFoundRegistration(err)
	}
	return s.rules.ListByRegistration(ctx, registration.ID)
}

func (s *RuleService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.CreateRuleRequest) (*models.NotificationRule, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if err := s.validateOffset(req.OffsetMinutes); err != nil {
		return nil, err
	}
	channel, err := optionalChannel("channel_override", req.ChannelOverride)
	if err != nil {
		return nil, err
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	var created *models.NotificationRule
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		registration, err := s.registrations.GetByEventForUpdate(ctx, eventID)
		if err != nil {
			return notFoundRegistration(err)
		}

		slot := 0
		if req.SlotNo != nil {
			slot = *req.SlotNo
			if slot < 1 || slot > s.cfg.Notify.MaxRulesPerReg {
				return models.NewValidation("invalid slot number",
					models.FieldError{Field: "slot_no", Message: "allowed values range from 1 to " + itoa(s.cfg.Notify.MaxRulesPerReg)})
			}
		} else {
			slot, err = s.rules.NextFreeSlot(ctx, registration.ID, s.cfg.Notify.MaxRulesPerReg)
			if err != nil {
				return err
			}
		}

		created, err = s.rules.Create(ctx, &models.NotificationRule{
			RegistrationID:  registration.ID,
			OffsetMinutes:   req.OffsetMinutes,
			Enabled:         enabled,
			SlotNo:          slot,
			ChannelOverride: channel,
		})
		if err != nil {
			return err
		}

		if _, err := s.registrations.BumpScheduleVersion(ctx, registration.ID); err != nil {
			return err
		}
		if err := s.notifier.CancelForRegistration(ctx, registration.ID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditRuleChange, models.EntityNotificationRule, created.ID, nil,
			map[string]any{"offset_minutes": created.OffsetMinutes, "slot_no": created.SlotNo, "enabled": created.Enabled})
	})
	if err != nil {
		return nil, err
	}

	s.reconcile(ctx, eventID)
	return created, nil
}

func (s *RuleService) Update(ctx context.Context, actor models.Actor, ruleID uuid.UUID,
	req models.UpdateRuleRequest) (*models.NotificationRule, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if req.OffsetMinutes != nil {
		if err := s.validateOffset(*req.OffsetMinutes); err != nil {
			return nil, err
		}
	}
	channel, err := optionalChannel("channel_override", req.ChannelOverride)
	if err != nil {
		return nil, err
	}
	clearChannel := req.ChannelOverride != nil && *req.ChannelOverride == ""

	var (
		updated *models.NotificationRule
		eventID uuid.UUID
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.rules.GetByID(ctx, ruleID)
		if err != nil {
			return err
		}
		reg, err := s.registrations.GetByID(ctx, before.RegistrationID)
		if err != nil {
			return err
		}
		eventID = reg.EventID

		updated, err = s.rules.Update(ctx, ruleID, req.OffsetMinutes, req.Enabled, channel, clearChannel)
		if err != nil {
			return err
		}

		scheduleChanged := (req.OffsetMinutes != nil && *req.OffsetMinutes != before.OffsetMinutes) ||
			(req.Enabled != nil && *req.Enabled != before.Enabled)
		if scheduleChanged {
			if _, err := s.registrations.BumpScheduleVersion(ctx, reg.ID); err != nil {
				return err
			}
			if err := s.notifier.CancelForRegistration(ctx, reg.ID); err != nil {
				return err
			}
		}
		return s.audit.Record(ctx, actor, models.AuditRuleChange, models.EntityNotificationRule, ruleID,
			map[string]any{"offset_minutes": before.OffsetMinutes, "enabled": before.Enabled,
				"channel_override": before.ChannelOverride},
			map[string]any{"offset_minutes": updated.OffsetMinutes, "enabled": updated.Enabled,
				"channel_override": updated.ChannelOverride})
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
			models.FieldError{Field: "offset_minutes", Message: "allowed range is " + itoa(limit) + " minutes"})
	}
	return nil
}

func (s *RuleService) reconcile(ctx context.Context, eventID uuid.UUID) {
	if s.reconciler == nil || eventID == uuid.Nil {
		return
	}
	if err := s.reconciler.ReconcileEvent(ctx, eventID); err != nil {
		logReconcileFailure(ctx, eventID, err)
	}
}

func optionalChannel(field string, value *string) (*models.Channel, error) {
	if value == nil || *value == "" {
		return nil, nil
	}
	channel, err := parseChannel(field, *value)
	if err != nil {
		return nil, err
	}
	return &channel, nil
}
