package identity

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Users struct{ db *postgres.DB }

func NewUsers(db *postgres.DB) *Users { return &Users{db: db} }

const userColumns = `id, display_id, first_name, middle_name, last_name, legacy_display_name, nickname,
	profile_public, profile_visibility, pinned_event_ids, theme, email, pending_email, password_hash,
	email_verified_at, telegram_username, telegram_chat_id, notification_channels, avatar_url, bio,
	locale, timezone, shortcuts, is_admin, is_active, deleted_at, created_at, updated_at`

func scanUser(row pgx.Row) (*models.User, error) {
	var (
		u        models.User
		channels []string
	)
	err := row.Scan(&u.ID, &u.DisplayID, &u.FirstName, &u.MiddleName, &u.LastName,
		&u.LegacyDisplayName, &u.Nickname, &u.ProfilePublic, &u.ProfileVisibility, &u.PinnedEventIDs,
		&u.Theme, &u.Email, &u.PendingEmail,
		&u.PasswordHash, &u.EmailVerifiedAt,
		&u.TelegramUsername, &u.TelegramChatID, &channels,
		&u.AvatarURL, &u.Bio,
		&u.Locale, &u.Timezone, &u.Shortcuts, &u.IsAdmin, &u.IsActive,
		&u.DeletedAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	u.NotificationChannels = toChannelSet(channels)
	return &u, nil
}

func toChannelSet(values []string) models.ChannelSet {
	out := make(models.ChannelSet, 0, len(values))
	for _, v := range values {
		out = append(out, models.Channel(v))
	}
	return out
}

func (r *Users) Create(ctx context.Context, u *models.User) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO users (first_name, middle_name, last_name, nickname, email, password_hash,
			is_admin, is_active, email_verified_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING `+userColumns,
		u.FirstName, u.MiddleName, u.LastName, u.Nickname, u.Email, u.PasswordHash,
		u.IsAdmin, u.IsActive, u.EmailVerifiedAt))
}

func (r *Users) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id))
}

func (r *Users) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.Q(ctx).QueryRow(ctx,
		`SELECT id FROM users WHERE display_id = $1`, displayID).Scan(&id)
	if err != nil {
		if errors.Is(mapError(err), models.ErrNotFound) {
			return uuid.Nil, models.NewNotFound("user not found")
		}
		return uuid.Nil, mapError(err)
	}
	return id, nil
}

func (r *Users) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE email = $1`, NormalizeEmail(email)))
}

func (r *Users) EmailTaken(ctx context.Context, email string, except uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM users
			WHERE (email = $1 OR pending_email = $1) AND ($2::uuid IS NULL OR id <> $2)
		)`, NormalizeEmail(email), postgres.NullUUID(except)).Scan(&exists)
	if err != nil {
		return false, mapError(err)
	}
	return exists, nil
}

func (r *Users) UpdateProfile(ctx context.Context, id uuid.UUID, p dto.ProfilePatch) (*models.User, error) {
	var channels []string
	if p.NotificationChannels != nil {
		channels = make([]string, 0, len(*p.NotificationChannels))
		for _, ch := range *p.NotificationChannels {
			channels = append(channels, string(ch))
		}
	}
	return scanUser(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE users SET
			first_name = COALESCE($2, first_name),
			middle_name = CASE WHEN $13 THEN NULL ELSE COALESCE($14, middle_name) END,
			last_name = COALESCE($15, last_name),
			nickname = CASE WHEN $16 THEN NULL ELSE COALESCE($17, nickname) END,
			profile_visibility = COALESCE($18, profile_visibility),
			legacy_display_name = CASE
				WHEN $2 IS NOT NULL OR $15 IS NOT NULL OR $13 OR $14 IS NOT NULL
				THEN NULL ELSE legacy_display_name END,
			telegram_username = CASE WHEN $4 THEN NULL ELSE COALESCE($3, telegram_username) END,
			notification_channels = CASE WHEN $6 THEN $5 ELSE notification_channels END,
			avatar_url = CASE WHEN $7 THEN NULL ELSE COALESCE($8, avatar_url) END,
			bio = CASE WHEN $9 THEN NULL ELSE COALESCE($10, bio) END,
			locale = COALESCE($11, locale),
			timezone = COALESCE($12, timezone),
			theme = COALESCE($19, theme),
			pinned_event_ids = COALESCE($20::uuid[], pinned_event_ids)
		WHERE id = $1
		RETURNING `+userColumns,
		id, p.FirstName, p.TelegramUsername, p.ClearTelegramUsername,
		channels, p.NotificationChannels != nil,
		p.ClearAvatarURL, p.AvatarURL, p.ClearBio, p.Bio,
		p.Locale, p.Timezone,
		p.ClearMiddleName, p.MiddleName, p.LastName,
		p.ClearNickname, p.Nickname,
		p.ProfileVisibility, p.Theme, p.PinnedEventIDs))
}

func (r *Users) SetShortcuts(ctx context.Context, id uuid.UUID,
	shortcuts models.Shortcuts) (*models.User, error) {
	if shortcuts == nil {
		shortcuts = models.Shortcuts{}
	}
	return scanUser(r.db.Q(ctx).QueryRow(ctx,
		`UPDATE users SET shortcuts = $2 WHERE id = $1 RETURNING `+userColumns, id, shortcuts))
}

func (r *Users) SetPassword(ctx context.Context, id uuid.UUID, hash string) error {
	return r.exec(ctx, `UPDATE users SET password_hash = $2 WHERE id = $1`, id, hash)
}

func (r *Users) SetEmailVerified(ctx context.Context, id uuid.UUID) error {
	return r.exec(ctx, `UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL`, id)
}

func (r *Users) SetPendingEmail(ctx context.Context, id uuid.UUID, email string) error {
	return r.exec(ctx, `UPDATE users SET pending_email = $2 WHERE id = $1`, id, NormalizeEmail(email))
}

func (r *Users) ApplyPendingEmail(ctx context.Context, id uuid.UUID, email string) error {
	return r.exec(ctx, `
		UPDATE users
		SET email = $2, pending_email = NULL, email_verified_at = now()
		WHERE id = $1`, id, NormalizeEmail(email))
}

func (r *Users) RevertEmail(ctx context.Context, id uuid.UUID, originEmail string) error {
	return r.exec(ctx, `
		UPDATE users
		SET email = $2, pending_email = NULL, email_verified_at = now()
		WHERE id = $1`, id, NormalizeEmail(originEmail))
}

func (r *Users) SetActive(ctx context.Context, id uuid.UUID, active bool) error {
	return r.exec(ctx, `UPDATE users SET is_active = $2 WHERE id = $1`, id, active)
}

func (r *Users) SetAdmin(ctx context.Context, id uuid.UUID, admin bool) error {
	return r.exec(ctx, `UPDATE users SET is_admin = $2 WHERE id = $1`, id, admin)
}

func (r *Users) SetTelegram(ctx context.Context, id uuid.UUID, chatID string, username *string) error {
	return r.exec(ctx, `
		UPDATE users SET telegram_chat_id = $2, telegram_username = COALESCE($3, telegram_username)
		WHERE id = $1`, id, chatID, username)
}

func (r *Users) ClearTelegram(ctx context.Context, id uuid.UUID) error {
	return r.exec(ctx, `
		UPDATE users
		SET telegram_chat_id = NULL,
			notification_channels = array_remove(notification_channels, 'TELEGRAM')
		WHERE id = $1`, id)
}

func (r *Users) Anonymize(ctx context.Context, id uuid.UUID) error {
	return r.exec(ctx, `
		UPDATE users SET
			first_name = 'Deleted',
			middle_name = NULL,
			last_name = 'user',
			legacy_display_name = NULL,
			nickname = NULL,
			profile_visibility = 'private',
			pinned_event_ids = '{}',
			email = 'deleted+' || id::text || '@invalid.local',
			pending_email = NULL,
			password_hash = 'deleted',
			email_verified_at = NULL,
			telegram_username = NULL,
			telegram_chat_id = NULL,
			notification_channels = '{}',
			avatar_url = NULL,
			bio = NULL,
			shortcuts = '{}'::jsonb,
			is_active = false,
			is_admin = false,
			deleted_at = now()
		WHERE id = $1 AND deleted_at IS NULL`, id)
}

func (r *Users) exec(ctx context.Context, sql string, args ...any) error {
	tag, err := r.db.Q(ctx).Exec(ctx, sql, args...)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
