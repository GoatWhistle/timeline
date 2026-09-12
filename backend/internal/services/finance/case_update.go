package finance

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func validateCasePatch(req dto.UpdateEventCaseRequest) (models.EventCasePatch, error) {
	patch := models.EventCasePatch{
		CaseNo: req.CaseNo, ClearTrack: req.ClearTrack, ClearPrize: req.ClearPrize,
	}
	if req.Name != nil {
		name, err := text("name", *req.Name, caseNameLimit)
		if err != nil {
			return patch, err
		}
		patch.Name = &name
	}
	description, err := optionalText("description", req.Description, caseDescriptionLimit)
	if err != nil {
		return patch, err
	}
	patch.Description = description
	partner, err := optionalText("partner", req.Partner, casePartnerLimit)
	if err != nil {
		return patch, err
	}
	patch.Partner = partner
	if !req.ClearPrize {
		prize, err := optionalAmount("prize_amount", req.PrizeAmount)
		if err != nil {
			return patch, err
		}
		patch.PrizeAmount = prize
	}
	return patch, validateCaseNo(req.CaseNo)
}

func (s *CaseService) Update(ctx context.Context, actor models.Actor, id uuid.UUID,
	req dto.UpdateEventCaseRequest) (*dto.EventCaseResponse, error) {
	patch, err := validateCasePatch(req)
	if err != nil {
		return nil, err
	}

	var (
		updated *models.EventCase
		target  *models.Event
		tracks  []models.EventTrack
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.cases.GetByID(ctx, id)
		if err != nil {
			return err
		}
		target, err = s.writable(ctx, actor, before.EventID)
		if err != nil {
			return err
		}
		if !req.ClearTrack {
			patch.TrackID, err = s.resolveTrack(ctx, before.EventID, req.TrackID)
			if err != nil {
				return err
			}
		}
		updated, err = s.cases.Update(ctx, id, patch)
		if err != nil {
			return err
		}
		tracks, err = s.tracks.ListByEvent(ctx, before.EventID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditCaseUpdate, models.EntityEventCase, id,
			map[string]any{"name": before.Name, "case_no": before.CaseNo},
			map[string]any{"name": updated.Name, "case_no": updated.CaseNo})
	})
	if err != nil {
		return nil, err
	}
	out := CaseResponse(target, updated, tracks)
	return &out, nil
}
