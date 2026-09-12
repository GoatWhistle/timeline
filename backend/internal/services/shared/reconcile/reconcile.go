package reconcile

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func BuildCandidate(h *models.Event, r *models.Registration, p *models.EventParticipant,
	statusID uuid.UUID, todoCycle int, u *models.User) models.ReconcileCandidate {
	return models.ReconcileCandidate{
		EventID:           h.ID,
		EventDisplayID:    h.DisplayID,
		EventTitle:        h.Title,
		EventEndAt:        h.EndAt,
		RegistrationID:    r.ID,
		RegistrationURL:   r.URL,
		DeadlineAt:        r.DeadlineAt,
		ScheduleVersion:   r.ScheduleVersion,
		ActivationVersion: r.ActivationVersion,
		ContentVersion:    r.NotificationContentVersion,
		ParticipantID:     p.ID,
		AssignmentVersion: p.AssignmentVersion,
		StatusID:          statusID,
		TodoCycle:         todoCycle,
		RecipientID:       u.ID,
		RecipientLocale:   u.Locale,
		RecipientTimezone: u.Timezone,
		RecipientChannels: models.RecipientChannels{
			TelegramLinked: u.TelegramLinked(),
			EmailVerified:  u.EmailVerified(),
			Selected:       u.NotificationChannels,
		},
	}
}

func LogReconcileFailure(ctx context.Context, eventID uuid.UUID, err error) {
	slog.ErrorContext(ctx, "notification reconciliation failed, retry left to scheduler",
		"error", err, "event_id", eventID)
}
