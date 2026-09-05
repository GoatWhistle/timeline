package query

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Digests struct{ db *postgres.DB }

func NewDigests(db *postgres.DB) *Digests { return &Digests{db: db} }

func (r *Digests) Recipients(ctx context.Context, after uuid.UUID,
	limit int) ([]models.DigestRecipient, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT id, locale, timezone
		FROM users
		WHERE is_active
		  AND deleted_at IS NULL
		  AND ($1::uuid IS NULL OR id > $1)
		ORDER BY id
		LIMIT $2`, postgres.NullUUID(after), limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.DigestRecipient, 0, limit)
	for rows.Next() {
		var c models.DigestRecipient
		if err := rows.Scan(&c.UserID, &c.Locale, &c.Timezone); err != nil {
			return nil, mapError(err)
		}
		items = append(items, c)
	}
	return items, mapError(rows.Err())
}

func (r *Digests) Items(ctx context.Context, userID uuid.UUID, from, until time.Time,
	limit int) ([]models.DigestItem, error) {
	rows, err := r.db.Q(ctx).Query(ctx, `
		SELECT 'REGISTRATION_DEADLINE', e.id, e.display_id, e.title, e.title, reg.deadline_at
		FROM registration_statuses s
		JOIN registrations reg ON reg.id = s.registration_id
		JOIN events e ON e.id = s.event_id
		JOIN event_participants p ON p.id = s.participant_id
		WHERE p.user_id = $1
		  AND s.status = 'TODO'
		  AND reg.state = 'ACTIVE'
		  AND p.participation_status = 'ASSIGNED'
		  AND e.published_at IS NOT NULL
		  AND e.archived_at IS NULL
		  AND reg.deadline_at >= $2
		  AND reg.deadline_at < $3

		UNION ALL

		SELECT 'STAGE_START', e.id, e.display_id, e.title, st.name, st.start_at
		FROM stages st
		JOIN events e ON e.id = st.event_id
		JOIN event_participants p ON p.event_id = e.id
		WHERE p.user_id = $1
		  AND p.participation_status = 'ASSIGNED'
		  AND e.published_at IS NOT NULL
		  AND e.archived_at IS NULL
		  AND st.start_at >= $2
		  AND st.start_at < $3

		UNION ALL

		SELECT 'PERSONAL_TASK', e.id, e.display_id, e.title, t.title, t.due_at
		FROM participant_tasks t
		JOIN events e ON e.id = t.event_id
		WHERE t.user_id = $1
		  AND t.done_at IS NULL
		  AND t.due_at IS NOT NULL
		  AND e.archived_at IS NULL
		  AND t.due_at >= $2
		  AND t.due_at < $3

		ORDER BY 6, 4, 5
		LIMIT $4`, userID, from, until, limit)
	if err != nil {
		return nil, mapError(err)
	}
	defer rows.Close()

	items := make([]models.DigestItem, 0, limit)
	for rows.Next() {
		var c models.DigestItem
		if err := rows.Scan(&c.Kind, &c.EventID, &c.EventDisplayID, &c.EventTitle, &c.Title, &c.At); err != nil {
			return nil, mapError(err)
		}
		items = append(items, c)
	}
	return items, mapError(rows.Err())
}
