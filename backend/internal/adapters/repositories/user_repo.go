package repositories

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/GoatWhistle/timeline/internal/models"
)

type UserRepository struct{ db *DB }

func NewUserRepository(db *DB) *UserRepository { return &UserRepository{db: db} }

const userColumns = `id, display_name, email, pending_email, password_hash, email_verified_at,
	telegram_username, telegram_chat_id, preferred_channel, locale, is_admin, is_active,
	deleted_at, created_at, updated_at`

func scanUser(row pgx.Row) (*models.User, error) {
	var u models.User
	err := row.Scan(&u.ID, &u.DisplayName, &u.Email, &u.PendingEmail, &u.PasswordHash, &u.EmailVerifiedAt,
		&u.TelegramUsername, &u.TelegramChatID, &u.PreferredChannel, &u.Locale, &u.IsAdmin, &u.IsActive,
		&u.DeletedAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &u, nil
}

func (r *UserRepository) Create(ctx context.Context, u *models.User) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO users (display_name, email, password_hash, is_admin, is_active, email_verified_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+userColumns,
		u.DisplayName, u.Email, u.PasswordHash, u.IsAdmin, u.IsActive, u.EmailVerifiedAt))
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx, `SELECT `+userColumns+` FROM users WHERE id = $1`, id))
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE email = $1`, NormalizeEmail(email)))
}

func (r *UserRepository) GetByChatID(ctx context.Context, chatID string) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE telegram_chat_id = $1`, chatID))
}

func (r *UserRepository) EmailTaken(ctx context.Context, email string, except uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM users
			WHERE (email = $1 OR pending_email = $1) AND ($2::uuid IS NULL OR id <> $2)
		)`, NormalizeEmail(email), nullUUID(except)).Scan(&exists)
	if err != nil {
		return false, mapError(err)
	}
	return exists, nil
}

func (r *UserRepository) UpdateProfile(ctx context.Context, id uuid.UUID, p models.ProfilePatch) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE users SET
			display_name = COALESCE($2, display_name),
			telegram_username = CASE WHEN $4 THEN NULL ELSE COALESCE($3, telegram_username) END,
			preferred_channel = CASE WHEN $6 THEN NULL ELSE COALESCE($5, preferred_channel) END,
			locale = COALESCE($7, locale)
		WHERE id = $1
		RETURNING `+userColumns,
		id, p.DisplayName, p.TelegramUsername, p.ClearTelegramUsername,
		p.PreferredChannel, p.ClearPreferredChannel, p.Locale))
}

func (r *UserRepository) SetPassword(ctx context.Context, id uuid.UUID, hash string) error {
	return r.exec(ctx, `UPDATE users SET password_hash = $2 WHERE id = $1`, id, hash)
}

func (r *UserRepository) SetEmailVerified(ctx context.Context, id uuid.UUID) error {
	return r.exec(ctx, `UPDATE users SET email_verified_at = now() WHERE id = $1 AND email_verified_at IS NULL`, id)
}

func (r *UserRepository) SetPendingEmail(ctx context.Context, id uuid.UUID, email string) error {
	return r.exec(ctx, `UPDATE users SET pending_email = $2 WHERE id = $1`, id, NormalizeEmail(email))
}

func (r *UserRepository) ApplyPendingEmail(ctx context.Context, id uuid.UUID, email string) error {
	return r.exec(ctx, `
		UPDATE users
		SET email = $2, pending_email = NULL, email_verified_at = now()
		WHERE id = $1`, id, NormalizeEmail(email))
}

func (r *UserRepository) SetActive(ctx context.Context, id uuid.UUID, active bool) error {
	return r.exec(ctx, `UPDATE users SET is_active = $2 WHERE id = $1`, id, active)
}

func (r *UserRepository) SetTelegram(ctx context.Context, id uuid.UUID, chatID string, username *string) error {
	return r.exec(ctx, `
		UPDATE users SET telegram_chat_id = $2, telegram_username = COALESCE($3, telegram_username)
		WHERE id = $1`, id, chatID, username)
}

func (r *UserRepository) ClearTelegram(ctx context.Context, id uuid.UUID) error {
	return r.exec(ctx, `
		UPDATE users
		SET telegram_chat_id = NULL,
			preferred_channel = CASE WHEN preferred_channel = 'TELEGRAM' THEN NULL ELSE preferred_channel END
		WHERE id = $1`, id)
}

func (r *UserRepository) Anonymize(ctx context.Context, id uuid.UUID) error {
	return r.exec(ctx, `
		UPDATE users SET
			display_name = 'Deleted user',
			email = 'deleted+' || id::text || '@invalid.local',
			pending_email = NULL,
			password_hash = 'deleted',
			email_verified_at = NULL,
			telegram_username = NULL,
			telegram_chat_id = NULL,
			preferred_channel = NULL,
			is_active = false,
			is_admin = false,
			deleted_at = now()
		WHERE id = $1 AND deleted_at IS NULL`, id)
}

func (r *UserRepository) Search(ctx context.Context, query string, page models.Page) ([]models.UserSummary, int64, error) {
	pattern := "%" + strings.ToLower(strings.TrimSpace(query)) + "%"
	var total int64
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(*) FROM users
		WHERE deleted_at IS NULL AND ($1 = '%%' OR lower(display_name) LIKE $1 OR email LIKE $1)`,
		pattern).Scan(&total)
	if err != nil {
		return nil, 0, mapError(err)
	}

	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT id, display_name, email, is_active FROM users
		WHERE deleted_at IS NULL AND ($1 = '%%' OR lower(display_name) LIKE $1 OR email LIKE $1)
		ORDER BY display_name, email
		LIMIT $2 OFFSET $3`, pattern, page.Limit(), page.Offset())
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.UserSummary, 0, page.Limit())
	for rows.Next() {
		var s models.UserSummary
		if err := rows.Scan(&s.ID, &s.DisplayName, &s.Email, &s.IsActive); err != nil {
			return nil, 0, mapError(err)
		}
		items = append(items, s)
	}
	return items, total, mapError(rows.Err())
}

func (r *UserRepository) exec(ctx context.Context, sql string, args ...any) error {
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

func nullUUID(id uuid.UUID) *uuid.UUID {
	if id == uuid.Nil {
		return nil
	}
	return &id
}
