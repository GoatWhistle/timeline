package identity

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (r *Users) GetByNickname(ctx context.Context, nickname string) (*models.User, error) {
	return scanUser(r.db.Q(ctx).QueryRow(ctx,
		`SELECT `+userColumns+` FROM users
		 WHERE lower(nickname) = $1 AND deleted_at IS NULL`,
		models.NormalizeNickname(nickname)))
}

func (r *Users) NicknameTaken(ctx context.Context, nickname string, except uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM users
			WHERE lower(nickname) = $1 AND deleted_at IS NULL
				AND ($2::uuid IS NULL OR id <> $2)
		)`, models.NormalizeNickname(nickname), postgres.NullUUID(except)).Scan(&exists)
	if err != nil {
		return false, mapError(err)
	}
	return exists, nil
}

func (r *Users) NicknameHeld(ctx context.Context, nickname string, by uuid.UUID,
	now time.Time) (bool, error) {
	var exists bool
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM nickname_reservations
			WHERE lower(nickname) = $1 AND released_at > $2
				AND ($3::uuid IS NULL OR user_id <> $3)
		)`, models.NormalizeNickname(nickname), now, postgres.NullUUID(by)).Scan(&exists)
	if err != nil {
		return false, mapError(err)
	}
	return exists, nil
}

func (r *Users) ReserveNickname(ctx context.Context, nickname string, userID uuid.UUID,
	releasedAt time.Time) error {
	_, err := r.db.Q(ctx).Exec(ctx, `
		INSERT INTO nickname_reservations (nickname, user_id, released_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (lower(nickname))
		DO UPDATE SET user_id = EXCLUDED.user_id, released_at = EXCLUDED.released_at`,
		nickname, userID, releasedAt)
	return mapError(err)
}

func (r *Users) DropReservation(ctx context.Context, nickname string) error {
	_, err := r.db.Q(ctx).Exec(ctx,
		`DELETE FROM nickname_reservations WHERE lower(nickname) = $1`,
		models.NormalizeNickname(nickname))
	return mapError(err)
}

func (r *Users) PublicProfileEvents(ctx context.Context,
	userID uuid.UUID) ([]dto.PublicProfileEvent, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT e.display_id, e.title, e.start_at, e.end_at
		FROM event_participants p
		JOIN events e ON e.id = p.event_id
		WHERE p.user_id = $1
			AND p.show_on_profile
			AND p.participation_status = 'ASSIGNED'
			AND e.published_at IS NOT NULL
			AND e.archived_at IS NULL
		ORDER BY e.start_at DESC`, userID)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.PublicProfileEvent, 0)
	for rows.Next() {
		var item dto.PublicProfileEvent
		if err := rows.Scan(&item.ID, &item.Title, &item.StartAt, &item.EndAt); err != nil {
			return nil, mapError(err)
		}
		items = append(items, item)
	}
	return items, mapError(rows.Err())
}
