package query

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (r *Timeline) RegistrationCoverage(ctx context.Context) (models.RegistrationCoverage, error) {
	var out models.RegistrationCoverage
	err := r.db.Q(ctx).QueryRow(ctx, `
		SELECT count(DISTINCT s.event_id),
		       count(*),
		       count(*) FILTER (WHERE s.status = 'DONE'),
		       count(*) FILTER (WHERE s.status = 'NOT_REQUIRED'),
		       count(*) FILTER (WHERE s.status = 'TODO')
		FROM registration_statuses s
		JOIN registrations r ON r.id = s.registration_id
		JOIN events h ON h.id = s.event_id
		JOIN event_participants p ON p.id = s.participant_id
		JOIN users u ON u.id = p.user_id
		WHERE h.published_at IS NOT NULL
		  AND h.archived_at IS NULL
		  AND r.state = 'ACTIVE'
		  AND p.participation_status = 'ASSIGNED'
		  AND u.is_active
		  AND u.deleted_at IS NULL`).Scan(&out.EventsCovered, &out.Total,
		&out.SelfReportedDone, &out.NotRequired, &out.Outstanding)
	if err != nil {
		return out, mapError(err)
	}
	if out.Total > 0 {
		out.Applicable = true
		share := float64(out.SelfReportedDone+out.NotRequired) / float64(out.Total)
		out.Share = &share
	}
	return out, nil
}
