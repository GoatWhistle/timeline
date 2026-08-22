package services

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// buildCandidate собирает вход согласования из уже прочитанных сущностей.
// Используется, когда уведомление создаётся в транзакции доменной операции,
// а не выборкой планировщика.
func buildCandidate(h *models.Hackathon, r *models.Registration, p *models.HackathonParticipant,
	statusID uuid.UUID, todoCycle int, u *models.User) models.ReconcileCandidate {
	return models.ReconcileCandidate{
		HackathonID:       h.ID,
		HackathonTitle:    h.Title,
		HackathonEndAt:    h.EndAt,
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

// logReconcileFailure фиксирует неудачу согласования: доменная операция уже
// зафиксирована, а недостающие уведомления создаст очередной запуск планировщика.
func logReconcileFailure(ctx context.Context, hackathonID uuid.UUID, err error) {
	slog.ErrorContext(ctx, "согласование уведомлений не выполнено, повтор оставлен планировщику",
		"error", err, "hackathon_id", hackathonID)
}
