package participation

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *StatusService) response(ctx context.Context, status *models.RegistrationStatus,
) (*models.RegistrationStatusResponse, error) {
	eventDisplayID, err := s.events.DisplayIDByID(ctx, status.EventID)
	if err != nil {
		return nil, err
	}
	registration, err := s.registrations.GetByID(ctx, status.RegistrationID)
	if err != nil {
		return nil, err
	}
	resp := &models.RegistrationStatusResponse{
		ID:               status.DisplayID,
		EventID:          eventDisplayID,
		RegistrationID:   registration.DisplayID,
		Status:           status.Status,
		TodoCycle:        status.TodoCycle,
		RegisteredAt:     status.RegisteredAt,
		LastChangeSource: status.LastChangeSource,
		Note:             status.Note,
		UpdatedAt:        status.UpdatedAt,
	}
	if status.LastChangedByUserID != nil {
		changedBy, err := s.users.GetByID(ctx, *status.LastChangedByUserID)
		if err == nil {
			resp.LastChangedByUserID = &changedBy.DisplayID
		}
	}
	participant, err := s.participants.GetByID(ctx, status.ParticipantID)
	if err != nil {
		return resp, nil
	}
	resp.ParticipantID = participant.DisplayID
	user, err := s.users.GetByID(ctx, participant.UserID)
	if err != nil {
		return resp, nil
	}
	summary := userSummary(user)
	resp.User = &summary
	return resp, nil
}
