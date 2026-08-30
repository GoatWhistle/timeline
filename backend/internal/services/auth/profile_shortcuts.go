package auth

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *ProfileService) UpdateShortcuts(ctx context.Context, actor models.Actor,
	req dto.UpdateShortcutsRequest) (*models.User, error) {
	cleaned, err := validation.Shortcuts(req.Shortcuts)
	if err != nil {
		return nil, err
	}

	var updated *models.User
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		updated, err = s.users.SetShortcuts(ctx, actor.UserID, cleaned)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"shortcuts": before.Shortcuts}, map[string]any{"shortcuts": updated.Shortcuts})
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *ProfileService) ResetShortcuts(ctx context.Context, actor models.Actor) (*models.User, error) {
	return s.UpdateShortcuts(ctx, actor, dto.UpdateShortcutsRequest{Shortcuts: models.Shortcuts{}})
}
