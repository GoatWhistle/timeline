package auth

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *ProfileService) SessionPolicy(ctx context.Context, userID uuid.UUID) (*int, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return user.SessionIdleDays, nil
}

func (s *ProfileService) SetSessionPolicy(ctx context.Context, actor models.Actor,
	req dto.UpdateSessionPolicyRequest) (*int, error) {
	if err := validateSessionIdleDays(req.IdleDays); err != nil {
		return nil, err
	}

	var stored *int
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		updated, err := s.users.SetSessionIdleDays(ctx, actor.UserID, req.IdleDays)
		if err != nil {
			return err
		}
		stored = updated.SessionIdleDays
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"session_idle_days": before.SessionIdleDays},
			map[string]any{"session_idle_days": updated.SessionIdleDays})
	})
	if err != nil {
		return nil, err
	}
	return stored, nil
}

func validateSessionIdleDays(days *int) error {
	if days == nil {
		return nil
	}
	if *days < models.SessionIdleDaysMin || *days > models.SessionIdleDaysMax {
		return models.NewValidation("the idle period is out of range",
			models.FieldError{Field: "idle_days", Code: models.FieldCodeOutOfRange,
				Message: "must be between 1 and 365 days"})
	}
	return nil
}
