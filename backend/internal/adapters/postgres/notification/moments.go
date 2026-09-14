package notification

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

const momentWhere = `
	e.published_at IS NOT NULL
	AND e.archived_at IS NULL
	AND p.participation_status = 'ASSIGNED'
	AND u.is_active
	AND u.deleted_at IS NULL`

const momentRecipient = `
	u.id, u.locale, u.timezone, u.telegram_chat_id IS NOT NULL, u.email_verified_at IS NOT NULL,
	u.notification_channels, u.reminder_schedule_version,
	COALESCE((SELECT array_agg(np.occasion || ':' || np.channel)
	          FROM notification_preferences np
	          WHERE np.user_id = u.id AND NOT np.enabled), '{}')`

const momentSelect = `
	SELECT 'REMINDER_EVENT_START', e.id, e.display_id, e.title, NULL::uuid, '', e.start_at,` +
	momentRecipient + `
	FROM events e
	JOIN event_participants p ON p.event_id = e.id
	JOIN users u ON u.id = p.user_id
	WHERE` + momentWhere + `
	  AND e.start_at > $1

	UNION ALL

	SELECT 'REMINDER_EVENT_END', e.id, e.display_id, e.title, NULL::uuid, '', e.end_at,` +
	momentRecipient + `
	FROM events e
	JOIN event_participants p ON p.event_id = e.id
	JOIN users u ON u.id = p.user_id
	WHERE` + momentWhere + `
	  AND e.end_at > $1

	UNION ALL

	SELECT 'REMINDER_STAGE_START', e.id, e.display_id, e.title, st.id, st.name, st.start_at,` +
	momentRecipient + `
	FROM stages st
	JOIN events e ON e.id = st.event_id
	JOIN event_participants p ON p.event_id = e.id
	JOIN users u ON u.id = p.user_id
	WHERE` + momentWhere + `
	  AND st.start_at > $1`

func (r *Scheduler) MomentCandidates(ctx context.Context, notBefore time.Time, after uuid.UUID,
	userLimit int) ([]models.MomentCandidate, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		WITH named (occasion, event_id, event_display_id, event_title,
			stage_id, stage_name, moment_at, user_id, locale, timezone, telegram_linked,
			email_verified, channels, schedule_version, muted) AS (`+momentSelect+`),
		page AS (
			SELECT DISTINCT user_id FROM named
			WHERE ($2::uuid IS NULL OR user_id > $2)
			ORDER BY user_id
			LIMIT $3
		)
		SELECT n.* FROM named n JOIN page ON page.user_id = n.user_id
		ORDER BY n.user_id, n.occasion, n.event_id, n.stage_id`,
		notBefore, postgres.NullUUID(after), userLimit)
	if err != nil {
		return nil, mapError(err)
	}
	return scanMomentCandidates(rows, userLimit)
}

func (r *Scheduler) MomentCandidatesForEvent(ctx context.Context, eventID uuid.UUID,
	notBefore time.Time, limit int) ([]models.MomentCandidate, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		WITH named (occasion, event_id, event_display_id, event_title,
			stage_id, stage_name, moment_at, user_id, locale, timezone, telegram_linked,
			email_verified, channels, schedule_version, muted) AS (`+momentSelect+`)
		SELECT * FROM named
		WHERE event_id = $2
		ORDER BY user_id, occasion, event_id, stage_id
		LIMIT $3`, notBefore, eventID, limit)
	if err != nil {
		return nil, mapError(err)
	}
	return scanMomentCandidates(rows, limit)
}

func scanMomentCandidates(rows pgx.Rows, limit int) ([]models.MomentCandidate, error) {
	defer rows.Close()

	items := make([]models.MomentCandidate, 0, limit)
	for rows.Next() {
		var (
			c        models.MomentCandidate
			channels []string
			muted    []string
		)
		if err := rows.Scan(&c.Occasion, &c.EventID, &c.EventDisplayID, &c.EventTitle,
			&c.StageID, &c.StageName, &c.MomentAt,
			&c.RecipientID, &c.RecipientLocale, &c.RecipientTimezone,
			&c.RecipientChannels.TelegramLinked, &c.RecipientChannels.EmailVerified,
			&channels, &c.ScheduleVersion, &muted); err != nil {
			return nil, mapError(err)
		}
		c.RecipientChannels.Selected = toChannelSet(channels)
		c.RecipientChannels.Preferences = mutedPreferences(muted)
		items = append(items, c)
	}
	return items, mapError(rows.Err())
}
