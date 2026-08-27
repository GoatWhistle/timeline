package services

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

func buildCandidate(h *models.Event, r *models.Registration, p *models.EventParticipant,
	statusID uuid.UUID, todoCycle int, u *models.User) models.ReconcileCandidate {
	return models.ReconcileCandidate{
		EventID:           h.ID,
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
		RecipientChannels: models.RecipientChannels{
			TelegramLinked:   u.TelegramLinked(),
			EmailVerified:    u.EmailVerified(),
			PreferredChannel: u.PreferredChannel,
		},
	}
}

func logReconcileFailure(ctx context.Context, eventID uuid.UUID, err error) {
	slog.ErrorContext(ctx, "notification reconciliation failed, retry left to scheduler",
		"error", err, "event_id", eventID)
}
