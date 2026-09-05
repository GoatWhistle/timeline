package auth

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *ProfileService) NotificationPreferences(ctx context.Context, userID uuid.UUID,
) ([]models.NotificationPreference, error) {
	return s.prefs.List(ctx, userID)
}

func (s *ProfileService) SetNotificationPreference(ctx context.Context, actor models.Actor,
	occasion models.NotificationOccasion, channel models.Channel, enabled bool,
) ([]models.NotificationPreference, error) {
	var prefs []models.NotificationPreference
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.prefs.List(ctx, actor.UserID)
		if err != nil {
			return err
		}
		if err := s.prefs.Set(ctx, actor.UserID, occasion, channel, enabled); err != nil {
			return err
		}
		prefs, err = s.prefs.List(ctx, actor.UserID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"notification_preferences": before}, map[string]any{"notification_preferences": prefs})
	})
	if err != nil {
		return nil, err
	}
	return prefs, nil
}
