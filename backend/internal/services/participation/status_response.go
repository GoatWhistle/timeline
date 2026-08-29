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
	resp := &models.RegistrationStatusResponse{
		ID:                  status.DisplayID,
		EventID:             eventDisplayID,
		RegistrationID:      status.RegistrationID,
		ParticipantID:       status.ParticipantID,
		Status:              status.Status,
		TodoCycle:           status.TodoCycle,
		RegisteredAt:        status.RegisteredAt,
		LastChangeSource:    status.LastChangeSource,
		LastChangedByUserID: status.LastChangedByUserID,
		Note:                status.Note,
		UpdatedAt:           status.UpdatedAt,
	}
	participant, err := s.participants.GetByID(ctx, status.ParticipantID)
	if err != nil {
		return resp, nil
	}
	user, err := s.users.GetByID(ctx, participant.UserID)
	if err != nil {
		return resp, nil
	}
	summary := userSummary(user)
	resp.User = &summary
	return resp, nil
}
