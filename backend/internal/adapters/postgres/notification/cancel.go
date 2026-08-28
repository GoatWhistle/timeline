package notification

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

type CancelScope struct {
	StatusID       *uuid.UUID
	ParticipantID  *uuid.UUID
	RegistrationID *uuid.UUID
	EventID        *uuid.UUID
	RecipientID    *uuid.UUID
	Types          []models.NotificationType
}

func (r *Notifications) CancelPending(ctx context.Context, scope CancelScope) (int64, error) {
	conds := []string{
		`(n.status = 'PENDING' OR (n.status = 'PROCESSING' AND n.provider_call_started_at IS NULL))`,
	}
	args := make([]any, 0, 4)
	join := ""

	if scope.StatusID != nil {
		args = append(args, *scope.StatusID)
		conds = append(conds, `n.registration_status_id = $`+itoa(len(args)))
	}
	if scope.ParticipantID != nil {
		args = append(args, *scope.ParticipantID)
		join = ` JOIN registration_statuses s ON s.id = n.registration_status_id`
		conds = append(conds, `s.participant_id = $`+itoa(len(args)))
	}
	if scope.RegistrationID != nil {
		args = append(args, *scope.RegistrationID)
		join = ` JOIN registration_statuses s ON s.id = n.registration_status_id`
		conds = append(conds, `s.registration_id = $`+itoa(len(args)))
	}
	if scope.EventID != nil {
		args = append(args, *scope.EventID)
		join = ` JOIN registration_statuses s ON s.id = n.registration_status_id`
		conds = append(conds, `s.event_id = $`+itoa(len(args)))
	}
	if scope.RecipientID != nil {
		args = append(args, *scope.RecipientID)
		conds = append(conds, `n.recipient_user_id = $`+itoa(len(args)))
	}
	if len(scope.Types) > 0 {
		types := make([]string, 0, len(scope.Types))
		for _, t := range scope.Types {
			types = append(types, string(t))
		}
		args = append(args, types)
		conds = append(conds, `n.notification_type = ANY($`+itoa(len(args))+`)`)
	}

	tag, err := r.db.Q(ctx).Exec(ctx, `
		UPDATE notifications SET status = 'CANCELLED', next_attempt_at = NULL, lease_expires_at = NULL
		WHERE id IN (
			SELECT n.id FROM notifications n`+join+`
			WHERE `+strings.Join(conds, " AND ")+`
		)`, args...)
	if err != nil {
		return 0, mapError(err)
	}
	return tag.RowsAffected(), nil
}
