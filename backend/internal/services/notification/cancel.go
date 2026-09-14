package notification

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/notification"
)

func (s *NotificationService) CancelForStatus(ctx context.Context, statusID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{StatusID: &statusID})
	return err
}

func (s *NotificationService) CancelForParticipant(ctx context.Context, participantID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{ParticipantID: &participantID})
	return err
}

func (s *NotificationService) CancelForRegistration(ctx context.Context, registrationID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{RegistrationID: &registrationID})
	return err
}

func (s *NotificationService) CancelForEvent(ctx context.Context, eventID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{EventID: &eventID})
	return err
}

func (s *NotificationService) CancelForRecipient(ctx context.Context, userID uuid.UUID) error {
	_, err := s.repo.CancelPending(ctx, notification.CancelScope{RecipientID: &userID})
	return err
}
