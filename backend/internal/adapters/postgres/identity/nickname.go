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
		SELECT e.display_id, e.title, e.kind, e.start_at, e.end_at, t.name
		FROM event_participants p
		JOIN events e ON e.id = p.event_id
		LEFT JOIN team_event_entries te ON te.event_id = e.id
		LEFT JOIN team_members tmb ON tmb.team_id = te.team_id AND tmb.user_id = p.user_id
			AND tmb.state = 'ACTIVE'
		LEFT JOIN team_event_participants tep ON tep.entry_id = te.id AND tep.member_id = tmb.id
		LEFT JOIN teams t ON t.id = tep.team_id
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
		if err := rows.Scan(&item.ID, &item.Title, &item.Kind, &item.StartAt, &item.EndAt,
			&item.TeamName); err != nil {
			return nil, mapError(err)
		}
		item.Role = "participant"
		items = append(items, item)
	}
	return items, mapError(rows.Err())
}

func (r *Users) PublicProfileSummary(ctx context.Context, userID uuid.UUID,
	includeOnTimeRate bool) (dto.PublicProfileSummary, error) {
	var summary dto.PublicProfileSummary
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(DISTINCT p.event_id), count(DISTINCT tmb.team_id)
		FROM event_participants p
		LEFT JOIN team_members tmb ON tmb.user_id = p.user_id AND tmb.state = 'ACTIVE'
		WHERE p.user_id = $1 AND p.participation_status = 'ASSIGNED'`,
		userID).Scan(&summary.EventCount, &summary.TeamCount)
	if err != nil {
		return summary, mapError(err)
	}
	if !includeOnTimeRate {
		return summary, nil
	}
	var total, onTime int
	err = r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(*),
			count(*) FILTER (WHERE s.status = 'DONE' AND s.registered_at <= r.deadline_at)
		FROM registration_statuses s
		JOIN event_participants p ON p.id = s.participant_id
		JOIN registrations r ON r.id = s.registration_id
		WHERE p.user_id = $1 AND s.status <> 'NOT_REQUIRED'`,
		userID).Scan(&total, &onTime)
	if err != nil {
		return summary, mapError(err)
	}
	if total > 0 {
		rate := float64(onTime) / float64(total)
		summary.OnTimeRegistrationRate = &rate
	}
	return summary, nil
}

func (r *Users) PublicProfileMonthlyActivity(ctx context.Context,
	userID uuid.UUID, since time.Time) ([]dto.MonthlyActivity, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT to_char(date_trunc('month', e.start_at), 'YYYY-MM'), count(*)
		FROM event_participants p
		JOIN events e ON e.id = p.event_id
		WHERE p.user_id = $1
			AND p.show_on_profile
			AND p.participation_status = 'ASSIGNED'
			AND e.published_at IS NOT NULL
			AND e.archived_at IS NULL
			AND e.start_at >= $2
		GROUP BY 1
		ORDER BY 1`, userID, since)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]dto.MonthlyActivity, 0)
	for rows.Next() {
		var item dto.MonthlyActivity
		if err := rows.Scan(&item.Month, &item.Count); err != nil {
			return nil, mapError(err)
		}
		items = append(items, item)
	}
	return items, mapError(rows.Err())
}

func (r *Users) PinnableEventIDs(ctx context.Context, userID uuid.UUID,
	candidates []uuid.UUID) ([]uuid.UUID, error) {
	if len(candidates) == 0 {
		return nil, nil
	}
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT e.id
		FROM event_participants p
		JOIN events e ON e.id = p.event_id
		WHERE p.user_id = $1
			AND p.show_on_profile
			AND p.participation_status = 'ASSIGNED'
			AND e.published_at IS NOT NULL
			AND e.archived_at IS NULL
			AND e.id = ANY($2)`, userID, candidates)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	valid := make([]uuid.UUID, 0, len(candidates))
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, mapError(err)
		}
		valid = append(valid, id)
	}
	return valid, mapError(rows.Err())
}
