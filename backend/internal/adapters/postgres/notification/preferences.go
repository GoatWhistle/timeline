package notification

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Preferences struct{ db *postgres.DB }

func NewPreferences(db *postgres.DB) *Preferences { return &Preferences{db: db} }

func (r *Preferences) Muted(ctx context.Context, userID uuid.UUID) (models.NotificationPreferences, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT occasion, channel FROM notification_preferences
		WHERE user_id = $1 AND NOT enabled`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	out := make(models.NotificationPreferences)
	for rows.Next() {
		var occasion, channel string
		if err := rows.Scan(&occasion, &channel); err != nil {
			return nil, mapError(err)
		}
		key := models.NotificationOccasion(occasion)
		out[key] = append(out[key], models.Channel(channel))
	}
	return out, mapError(rows.Err())
}

func (r *Preferences) List(ctx context.Context, userID uuid.UUID) ([]models.NotificationPreference, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT occasion, channel, enabled FROM notification_preferences
		WHERE user_id = $1`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	overrides := make(map[string]bool, 8)
	for rows.Next() {
		var occasion, channel string
		var enabled bool
		if err := rows.Scan(&occasion, &channel, &enabled); err != nil {
			return nil, mapError(err)
		}
		overrides[occasion+":"+channel] = enabled
	}
	if err := rows.Err(); err != nil {
		return nil, mapError(err)
	}

	out := models.DefaultPreferences()
	for i := range out {
		if enabled, ok := overrides[string(out[i].Occasion)+":"+string(out[i].Channel)]; ok {
			out[i].Enabled = enabled
		}
	}
	return out, nil
}

func (r *Preferences) Set(ctx context.Context, userID uuid.UUID,
	occasion models.NotificationOccasion, channel models.Channel, enabled bool) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		INSERT INTO notification_preferences (user_id, occasion, channel, enabled)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, occasion, channel) DO UPDATE SET enabled = EXCLUDED.enabled`,
		userID, string(occasion), string(channel), enabled)
	return mapError(err)
}
