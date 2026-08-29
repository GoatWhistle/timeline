package services

import (
	"context"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *StatusService) response(ctx context.Context, status *models.RegistrationStatus,
) (*models.RegistrationStatusResponse, error) {
	resp := &models.RegistrationStatusResponse{
		ID:                  status.ID,
		EventID:             status.EventID,
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
	resp.User = &models.UserSummary{
		ID: user.ID, DisplayName: user.DisplayName,
		Email: user.Email, IsActive: user.IsActive,
	}
	return resp, nil
}
