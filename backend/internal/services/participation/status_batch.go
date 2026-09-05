package participation

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *StatusService) BatchSet(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req dto.BatchSetStatusRequest, participantIDs dto.ResolvedIDs) (*dto.BatchResult, error) {
	targets, err := s.batchTargets(ctx, actor, eventID, req, participantIDs)
	if err != nil {
		return nil, err
	}

	result := &dto.BatchResult{Results: make([]dto.BatchItemResult, 0, participantIDs.Len())}
	for index, participantID := range participantIDs.IDs {
		if err := unresolved(participantIDs, index); err != nil {
			result.Results = append(result.Results,
				batchItem(index, req.ParticipantIDs[index], nil, err))
			countBatch(result, err)
			continue
		}
		status, ok := targets[participantID]
		if !ok {
			result.Results = append(result.Results, dto.BatchItemResult{
				Index: index, Key: req.ParticipantIDs[index], Status: "error",
				Code: "not_found", Message: "participant status not found",
			})
			result.Failed++
			continue
		}
		if status.Status == req.Status {
			result.Results = append(result.Results, dto.BatchItemResult{
				Index: index, Key: req.ParticipantIDs[index], ID: status.DisplayID, Status: "skipped",
				Code: "already_set", Message: "the participant already holds this status",
			})
			result.Skipped++
			continue
		}
		_, err := s.AdminChange(ctx, actor, status.ID, dto.AdminChangeStatusRequest{Status: req.Status, Note: req.Note})
		item := dto.BatchItemResult{Index: index, Key: req.ParticipantIDs[index]}
		if err == nil {
			item.ID = status.DisplayID
			item.Status = "ok"
		} else {
			var domainErr *models.DomainError
			if errors.As(err, &domainErr) {
				item.Code = domainErr.Code
				item.Message = domainErr.Message
			} else {
				item.Code = "internal_error"
				item.Message = "internal error"
			}
			if errors.Is(err, models.ErrConflict) {
				item.Status = "skipped"
			} else {
				item.Status = "error"
			}
		}
		result.Results = append(result.Results, item)
		countBatch(result, err)
	}
	return result, nil
}

func (s *StatusService) BatchSetPreview(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req dto.BatchSetStatusRequest, participantIDs dto.ResolvedIDs) (*dto.PreviewResponse, error) {
	targets, err := s.batchTargets(ctx, actor, eventID, req, participantIDs)
	if err != nil {
		return nil, err
	}
	preview := &dto.PreviewResponse{}
	for index, participantID := range participantIDs.IDs {
		if unresolved(participantIDs, index) != nil {
			preview.Skipped++
			continue
		}
		status, ok := targets[participantID]
		if !ok || status.Status == req.Status {
			preview.Skipped++
			continue
		}
		preview.Affected++
	}
	return preview, nil
}

func (s *StatusService) batchTargets(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req dto.BatchSetStatusRequest,
	participantIDs dto.ResolvedIDs) (map[uuid.UUID]*models.RegistrationStatus, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	if len(req.ParticipantIDs) == 0 {
		return nil, models.NewValidation("the participant list is empty")
	}
	if req.Status != models.StatusTODO && req.Status != models.StatusNotRequired {
		return nil, models.NewValidation("bulk updates allow only TODO and NOT_REQUIRED",
			models.FieldError{Field: "status", Message: "value is not allowed"})
	}

	registration, err := s.registrations.GetByEvent(ctx, eventID)
	if err != nil {
		return nil, notFoundRegistration(err)
	}

	targets := make(map[uuid.UUID]*models.RegistrationStatus, participantIDs.Len())
	for index, participantID := range participantIDs.IDs {
		if unresolved(participantIDs, index) != nil {
			continue
		}
		status, err := s.statuses.GetByParticipant(ctx, registration.ID, participantID)
		if errors.Is(err, models.ErrNotFound) {
			continue
		}
		if err != nil {
			return nil, err
		}
		targets[participantID] = status
	}
	return targets, nil
}
