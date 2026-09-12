package finance

import (
	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type caseDraft struct {
	name        string
	description *string
	partner     *string
	prize       *string
}

func validateCaseDraft(req dto.CreateEventCaseRequest) (caseDraft, error) {
	name, err := text("name", req.Name, caseNameLimit)
	if err != nil {
		return caseDraft{}, err
	}
	description, err := optionalText("description", req.Description, caseDescriptionLimit)
	if err != nil {
		return caseDraft{}, err
	}
	partner, err := optionalText("partner", req.Partner, casePartnerLimit)
	if err != nil {
		return caseDraft{}, err
	}
	prize, err := optionalAmount("prize_amount", req.PrizeAmount)
	if err != nil {
		return caseDraft{}, err
	}
	if err := validateCaseNo(req.CaseNo); err != nil {
		return caseDraft{}, err
	}
	return caseDraft{name: name, description: description, partner: partner, prize: prize}, nil
}

func optionalAmount(field string, raw *string) (*string, error) {
	if raw == nil {
		return nil, nil
	}
	amount, err := ParseWholeAmount(field, *raw)
	if err != nil {
		return nil, err
	}
	return Pointer(amount), nil
}

func trackNameOf(tracks []models.EventTrack, id *uuid.UUID) (*string, *string) {
	if id == nil {
		return nil, nil
	}
	for i := range tracks {
		if tracks[i].ID == *id {
			display := tracks[i].DisplayID
			name := tracks[i].Name
			return &display, &name
		}
	}
	return nil, nil
}

func CaseResponse(target *models.Event, item *models.EventCase,
	tracks []models.EventTrack) dto.EventCaseResponse {
	trackID, trackName := trackNameOf(tracks, item.TrackID)
	return dto.EventCaseResponse{
		ID:          item.DisplayID,
		EventID:     target.DisplayID,
		TrackID:     trackID,
		TrackName:   trackName,
		CaseNo:      item.CaseNo,
		Name:        item.Name,
		Description: item.Description,
		Partner:     item.Partner,
		PrizeAmount: item.PrizeAmount,
		CreatedAt:   item.CreatedAt,
		UpdatedAt:   item.UpdatedAt,
	}
}

func CaseResponses(target *models.Event, items []models.EventCase,
	tracks []models.EventTrack) []dto.EventCaseResponse {
	out := make([]dto.EventCaseResponse, 0, len(items))
	for i := range items {
		out = append(out, CaseResponse(target, &items[i], tracks))
	}
	return out
}
