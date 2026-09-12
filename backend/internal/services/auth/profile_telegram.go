package auth

import (
	"context"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/crypto"
)

func (s *ProfileService) StartTelegramLink(ctx context.Context, actor models.Actor) (string, time.Time, error) {
	secret, err := crypto.NewSecret()
	if err != nil {
		return "", time.Time{}, err
	}
	expires := s.now().Add(s.cfg.Auth.TelegramLinkTTL)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.tokens.InvalidateForUser(ctx, actor.UserID, models.PurposeTelegramLink); err != nil {
			return err
		}
		_, err := s.tokens.Create(ctx, &models.OneTimeToken{
			UserID:    &actor.UserID,
			Purpose:   models.PurposeTelegramLink,
			TokenHash: crypto.HashSecret(secret),
			ExpiresAt: expires,
		})
		return err
	})
	if err != nil {
		return "", time.Time{}, err
	}
	return s.telegram.DeepLink(secret), expires, nil
}

func (s *ProfileService) CompleteTelegramLink(ctx context.Context, token, chatID string,
	username *string) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		record, err := s.tokens.Consume(ctx, crypto.HashSecret(token), models.PurposeTelegramLink, s.now())
		if err != nil {
			return err
		}
		if record.UserID == nil {
			return models.ErrNotFound
		}
		user, err := s.users.GetByID(ctx, *record.UserID)
		if err != nil {
			return err
		}
		if !user.IsActive {
			return models.ErrNotFound
		}
		if err := s.users.SetTelegram(ctx, user.ID, chatID, username); err != nil {
			return err
		}
		return s.audit.Record(ctx, models.Actor{UserID: user.ID}, models.AuditUserProfileChange,
			models.EntityUser, user.ID, map[string]any{"telegram_linked": user.TelegramLinked()},
			map[string]any{"telegram_linked": true})
	})
}

func (s *ProfileService) UnlinkTelegram(ctx context.Context, actor models.Actor) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		if err := s.users.ClearTelegram(ctx, actor.UserID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditUserProfileChange, models.EntityUser, actor.UserID,
			map[string]any{"telegram_linked": true}, map[string]any{"telegram_linked": false})
	})
}

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
