package identity

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (r *Users) GetByTelegramChatID(ctx context.Context, chatID string) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE telegram_chat_id = $1`, chatID))
}

func (r *Users) SetNotificationChannels(ctx context.Context, id uuid.UUID,
	channels models.ChannelSet) (*models.User, error) {
	values := make([]string, 0, len(channels))
	for _, ch := range channels {
		values = append(values, string(ch))
	}
	return scanUser(r.db.Q(ctx).QueryRow(ctx,
		`UPDATE users SET notification_channels = $2 WHERE id = $1 RETURNING `+userColumns, id, values))
}
