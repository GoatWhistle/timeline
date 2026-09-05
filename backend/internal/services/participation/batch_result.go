package participation

import (
	"errors"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func unresolved(resolved dto.ResolvedIDs, index int) error {
	err := resolved.Failure(index)
	if err == nil {
		return nil
	}
	var domainErr *models.DomainError
	if errors.As(err, &domainErr) {
		return domainErr
	}
	return models.NewNotFound("the identifier could not be resolved")
}

func batchItem(index int, key string, participant *models.EventParticipant, err error) dto.BatchItemResult {
	item := dto.BatchItemResult{Index: index, Key: key}
	if err == nil {
		item.Status = "ok"
		if participant != nil {
			item.ID = participant.DisplayID
		}
		return item
	}

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
	return item
}

func countBatch(result *dto.BatchResult, err error) {
	switch {
	case err == nil:
		result.Succeeded++
	case errors.Is(err, models.ErrConflict):
		result.Skipped++
	default:
		result.Failed++
	}
}
