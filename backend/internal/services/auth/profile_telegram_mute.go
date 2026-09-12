package auth

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *ProfileService) MuteTelegram(ctx context.Context, actor models.Actor) error {
	return s.setTelegramMuted(ctx, actor, true)
}

func (s *ProfileService) UnmuteTelegram(ctx context.Context, actor models.Actor) error {
	return s.setTelegramMuted(ctx, actor, false)
}

func (s *ProfileService) setTelegramMuted(ctx context.Context, actor models.Actor, muted bool) error {
	if actor.IsSystem() {
		return models.NewUnauthorized("authentication is required")
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		user, err := s.users.GetByID(ctx, actor.UserID)
		if err != nil {
			return err
		}
		before := user.NotificationChannels
		after := toggleChannel(before, models.ChannelTelegram, !muted)
		if channelSetsEqual(before, after) {
			return nil
		}
		updated, err := s.users.SetNotificationChannels(ctx, actor.UserID, after)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"notification_channels": before},
			map[string]any{"notification_channels": updated.NotificationChannels})
	})
}

func toggleChannel(channels models.ChannelSet, ch models.Channel, enabled bool) models.ChannelSet {
	if enabled == channels.Has(ch) {
		return channels
	}
	if enabled {
		return models.NormalizeChannelSet(append(append(models.ChannelSet{}, channels...), ch))
	}
	out := make(models.ChannelSet, 0, len(channels))
	for _, c := range channels {
		if c != ch {
			out = append(out, c)
		}
	}
	return out
}

func channelSetsEqual(a, b models.ChannelSet) bool {
	if len(a) != len(b) {
		return false
	}
	for _, ch := range a {
		if !b.Has(ch) {
			return false
		}
	}
	return true
}
