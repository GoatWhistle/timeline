package participation

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/reconcile"
)

func (s *RegistrationService) SetState(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	state models.RegistrationState) (*models.Registration, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}

	var updated *models.Registration
	var reconcileNeeded bool
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
			reconcileNeeded = true
		}

		return s.audit.Record(ctx, actor, models.AuditRegistrationChange, models.EntityRegistration, before.ID,
			map[string]any{"state": before.State, "activation_version": before.ActivationVersion},
			map[string]any{"state": updated.State, "activation_version": updated.ActivationVersion})
	})
	if err != nil {
		return nil, err
	}

	if reconcileNeeded {
		s.reconcile(ctx, eventID)
	}
	return updated, nil
}

func (s *RegistrationService) reconcile(ctx context.Context, eventID uuid.UUID) {
	if s.reconciler == nil {
		return
	}
	if err := s.reconciler.ReconcileEvent(ctx, eventID); err != nil {
		reconcile.LogReconcileFailure(ctx, eventID, err)
	}
}
