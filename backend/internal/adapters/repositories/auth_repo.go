package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// SessionRepository — доступ к сессиям и цепочкам refresh-токенов.
type SessionRepository struct{ db *DB }

// NewSessionRepository создаёт репозиторий сессий.
func NewSessionRepository(db *DB) *SessionRepository { return &SessionRepository{db: db} }

const sessionColumns = `id, user_id, family_id, refresh_token_hash, user_agent, ip,
	expires_at, last_used_at, revoked_at, created_at`

func scanSession(row pgx.Row) (*models.Session, error) {
	var s models.Session
	err := row.Scan(&s.ID, &s.UserID, &s.FamilyID, &s.RefreshTokenHash, &s.UserAgent, &s.IP,
		&s.ExpiresAt, &s.LastUsedAt, &s.RevokedAt, &s.CreatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &s, nil
}

// Create сохраняет новую сессию.
func (r *SessionRepository) Create(ctx context.Context, s *models.Session) (*models.Session, error) {
	return scanSession(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO sessions (user_id, family_id, refresh_token_hash, user_agent, ip, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING `+sessionColumns,
		s.UserID, s.FamilyID, s.RefreshTokenHash, s.UserAgent, s.IP, s.ExpiresAt))
}

// GetByHash читает сессию по хешу refresh-токена.
func (r *SessionRepository) GetByHash(ctx context.Context, hash string) (*models.Session, error) {
	return scanSession(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+sessionColumns+` FROM sessions WHERE refresh_token_hash = $1`, hash))
}

// Revoke отзывает одну сессию.
func (r *SessionRepository) Revoke(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, id)
	return mapError(err)
}

// RevokeFamily отзывает всю цепочку ротации: применяется при повторном
// использовании уже отозванного refresh-токена.
func (r *SessionRepository) RevokeFamily(ctx context.Context, familyID uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL`, familyID)
	return mapError(err)
}

// RevokeAllForUser отзывает все активные сессии пользователя.
func (r *SessionRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, userID)
	return mapError(err)
}

// Rotate отзывает текущую сессию и создаёт следующую в той же цепочке.
func (r *SessionRepository) Rotate(ctx context.Context, current *models.Session, next *models.Session) (*models.Session, error) {
	if err := r.Revoke(ctx, current.ID); err != nil {
		return nil, err
	}
	next.FamilyID = current.FamilyID
	return r.Create(ctx, next)
}

// TokenRepository — доступ к одноразовым токенам.
type TokenRepository struct{ db *DB }

// NewTokenRepository создаёт репозиторий одноразовых токенов.
func NewTokenRepository(db *DB) *TokenRepository { return &TokenRepository{db: db} }

const tokenColumns = `id, user_id, purpose, token_hash, target_email, expires_at, consumed_at, created_at`

func scanToken(row pgx.Row) (*models.OneTimeToken, error) {
	var t models.OneTimeToken
	err := row.Scan(&t.ID, &t.UserID, &t.Purpose, &t.TokenHash, &t.TargetEmail,
		&t.ExpiresAt, &t.ConsumedAt, &t.CreatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &t, nil
}

// Create сохраняет одноразовый токен.
func (r *TokenRepository) Create(ctx context.Context, t *models.OneTimeToken) (*models.OneTimeToken, error) {
	return scanToken(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO one_time_tokens (user_id, purpose, token_hash, target_email, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING `+tokenColumns,
		t.UserID, t.Purpose, t.TokenHash, t.TargetEmail, t.ExpiresAt))
}

// Consume атомарно помечает токен использованным и возвращает его.
// Повторное предъявление того же токена вернёт ErrNotFound.
func (r *TokenRepository) Consume(ctx context.Context, hash string, purpose models.TokenPurpose, now time.Time) (*models.OneTimeToken, error) {
	return scanToken(r.db.Q(ctx).QueryRow(ctx, `
		UPDATE one_time_tokens SET consumed_at = $3
		WHERE token_hash = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > $3
		RETURNING `+tokenColumns, hash, purpose, now))
}

// InvalidateForUser гасит неиспользованные токены указанного назначения.
func (r *TokenRepository) InvalidateForUser(ctx context.Context, userID uuid.UUID, purpose models.TokenPurpose) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE one_time_tokens SET consumed_at = now()
		WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`, userID, purpose)
	return mapError(err)
}

// DeleteExpired удаляет истёкшие токены; вызывается процедурой обслуживания.
func (r *TokenRepository) DeleteExpired(ctx context.Context, before time.Time) (int64, error) {
	tag, err := r.db.Q(ctx).Exec(ctx, `DELETE FROM one_time_tokens WHERE expires_at < $1`, before)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}

// InviteRepository — доступ к приглашениям.
type InviteRepository struct{ db *DB }

// NewInviteRepository создаёт репозиторий приглашений.
func NewInviteRepository(db *DB) *InviteRepository { return &InviteRepository{db: db} }

const inviteColumns = `id, normalized_email, created_by_user_id, token_hash, expires_at,
	accepted_at, revoked_at, created_at`

func scanInvite(row pgx.Row) (*models.Invite, error) {
	var i models.Invite
	err := row.Scan(&i.ID, &i.NormalizedEmail, &i.CreatedByUserID, &i.TokenHash, &i.ExpiresAt,
		&i.AcceptedAt, &i.RevokedAt, &i.CreatedAt)
	if err != nil {
		return nil, mapError(err)
	}
	return &i, nil
}

// Create сохраняет приглашение.
func (r *InviteRepository) Create(ctx context.Context, i *models.Invite) (*models.Invite, error) {
	return scanInvite(r.db.Q(ctx).QueryRow(ctx, `
		INSERT INTO invites (normalized_email, created_by_user_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING `+inviteColumns,
		NormalizeEmail(i.NormalizedEmail), i.CreatedByUserID, i.TokenHash, i.ExpiresAt))
}

// GetByID читает приглашение по идентификатору.
func (r *InviteRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Invite, error) {
	return scanInvite(r.db.Q(ctx).QueryRow(ctx, `SELECT `+inviteColumns+` FROM invites WHERE id = $1`, id))
}

// GetByHash читает приглашение по хешу токена.
func (r *InviteRepository) GetByHash(ctx context.Context, hash string) (*models.Invite, error) {
	return scanInvite(r.db.Q(ctx).QueryRow(ctx, `SELECT `+inviteColumns+` FROM invites WHERE token_hash = $1`, hash))
}

// LockByEmail сериализует создание и повторную отправку приглашений по адресу.
// Блокировка снимается вместе с транзакцией.
func (r *InviteRepository) LockByEmail(ctx context.Context, email string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, NormalizeEmail(email))
	return mapError(err)
}

// RevokePendingByEmail отзывает все действующие приглашения адреса.
func (r *InviteRepository) RevokePendingByEmail(ctx context.Context, email string) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE invites SET revoked_at = now()
		WHERE normalized_email = $1 AND accepted_at IS NULL AND revoked_at IS NULL`, NormalizeEmail(email))
	return mapError(err)
}

// Revoke отзывает одно приглашение.
func (r *InviteRepository) Revoke(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE invites SET revoked_at = now()
		WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.ErrNotFound
	}
	return nil
}

// MarkAccepted отмечает приглашение принятым.
func (r *InviteRepository) MarkAccepted(ctx context.Context, id uuid.UUID) error {
	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE invites SET accepted_at = now()
		WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL`, id)
	if err != nil {
		return mapError(err)
	}
	if tag.RowsAffected() == 0 {
		return models.NewConflict("invite_not_usable", "приглашение уже использовано или отозвано")
	}
	return nil
}

// List возвращает страницу приглашений.
func (r *InviteRepository) List(ctx context.Context, page models.Page) ([]models.Invite, int64, error) {
	var total int64
	if err := r.db.Q(ctx).QueryRow(ctx, `SELECT count(*) FROM invites`).Scan(&total); err != nil {
		return nil, 0, mapError(err)
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT `+inviteColumns+` FROM invites
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`, page.Limit(), page.Offset())
	if err != nil {
		return nil, 0, mapError(err)
	}
	defer rows.Close()

	items := make([]models.Invite, 0, page.Limit())
	for rows.Next() {
		var i models.Invite
		if err := rows.Scan(&i.ID, &i.NormalizedEmail, &i.CreatedByUserID, &i.TokenHash, &i.ExpiresAt,
			&i.AcceptedAt, &i.RevokedAt, &i.CreatedAt); err != nil {
			return nil, 0, mapError(err)
		}
		items = append(items, i)
	}
	return items, total, mapError(rows.Err())
}
