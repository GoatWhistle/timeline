package event

import (
	"context"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *TrackService) Update(ctx context.Context, actor models.Actor, id uuid.UUID,
	req dto.UpdateEventTrackRequest) (*dto.EventTrackResponse, error) {
	if req.Name != nil {
		name, err := validation.ValidateText("name", *req.Name, 1, 120)
		if err != nil {
			return nil, err
		}
		req.Name = &name
	}
	if req.Description != nil {
		description, err := validation.OptionalText("description", req.Description, 4000)
		if err != nil {
			return nil, err
		}
		req.Description = description
	}
	if err := validateTrackNo(req.TrackNo); err != nil {
		return nil, err
	}
	prizes, total, err := validatePrizeInputs(req.Prizes)
	if err != nil {
		return nil, err
	}

	var (
		updated *models.EventTrack
		target  *models.Event
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.tracks.GetByID(ctx, id)
		if err != nil {
			return err
		}
		target, err = s.writable(ctx, actor, before.EventID)
		if err != nil {
			return err
		}
		if err := s.checkTrackPool(ctx, target, before.EventID, id, req.SetPrizes, total); err != nil {
			return err
		}
		if err := s.reorderTrackNo(ctx, before, req.TrackNo); err != nil {
			return err
		}
		updated, err = s.tracks.Update(ctx, id, req.Name, req.Description, req.TrackNo)
		if err != nil {
			return err
		}
		updated.Prizes, err = s.settleTrackPrizes(ctx, before.EventID, id, req.SetPrizes, prizes)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTrackUpdate, models.EntityEventTrack, id,
			map[string]any{"name": before.Name, "track_no": before.TrackNo},
			map[string]any{"name": updated.Name, "track_no": updated.TrackNo,
				"prize_total": sumPrizes(updated.Prizes)})
	})
	if err != nil {
		return nil, err
	}
	out := TrackResponse(target, updated)
	return &out, nil
}

func prizesOf(tracks []models.EventTrack, id uuid.UUID) []models.TrackPrize {
	for i := range tracks {
		if tracks[i].ID == id {
			return tracks[i].Prizes
		}
	}
	return []models.TrackPrize{}
}

func TrackResponse(target *models.Event, track *models.EventTrack) dto.EventTrackResponse {
	prizes := make([]dto.TrackPrizeResponse, 0, len(track.Prizes))
	for _, p := range track.Prizes {
		prizes = append(prizes, dto.TrackPrizeResponse{
			ID: p.DisplayID, Place: p.Place, Title: p.Title, Amount: p.Amount,
		})
	}
	return dto.EventTrackResponse{
		ID:          track.DisplayID,
		EventID:     target.DisplayID,
		TrackNo:     track.TrackNo,
		Name:        track.Name,
		Description: track.Description,
		Prizes:      prizes,
		PrizeTotal:  sumPrizes(track.Prizes),
		CreatedAt:   track.CreatedAt,
		UpdatedAt:   track.UpdatedAt,
	}
}

func mustWhole(value string) int64 {
	trimmed := strings.TrimSpace(value)
	if dot := strings.IndexByte(trimmed, '.'); dot >= 0 {
		trimmed = trimmed[:dot]
	}
	amount, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil {
		return 0
	}
	return amount
}

func formatWhole(value int64) string { return strconv.FormatInt(value, 10) }

func pointerWhole(value int64) *string {
	out := formatWhole(value)
	return &out
}

func wholePool(pool *string) *string {
	if pool == nil {
		return nil
	}
	return pointerWhole(mustWhole(*pool))
}

func (s *TrackService) reorderTrackNo(ctx context.Context, before *models.EventTrack,
	trackNo *int) error {
	if trackNo == nil || *trackNo == before.TrackNo {
		return nil
	}
	occupant, err := s.tracks.OccupantOfTrackNo(ctx, before.EventID, before.ID, *trackNo)
	if err != nil {
		return err
	}
	if occupant == uuid.Nil {
		return nil
	}
	parked, err := s.tracks.ParkTrackNo(ctx, before.EventID, before.ID)
	if err != nil {
		return err
	}
	if !parked {
		return models.NewConflict("track_slots_exhausted",
			"free a track number before reordering")
	}
	if err := s.tracks.SetTrackNo(ctx, occupant, before.TrackNo); err != nil {
		return err
	}
	return s.tracks.SetTrackNo(ctx, before.ID, *trackNo)
}

func (s *TrackService) checkTrackPool(ctx context.Context, target *models.Event,
	eventID, id uuid.UUID, setPrizes bool, total int64) error {
	if !setPrizes {
		return nil
	}
	others, err := s.tracks.DistributedTotal(ctx, eventID, &id)
	if err != nil {
		return err
	}
	return checkPoolCoverage(target.PrizePool, others, total)
}

func (s *TrackService) settleTrackPrizes(ctx context.Context, eventID, id uuid.UUID,
	setPrizes bool, prizes []models.TrackPrize) ([]models.TrackPrize, error) {
	if setPrizes {
		return s.tracks.ReplacePrizes(ctx, id, eventID, prizes)
	}
	current, err := s.tracks.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	return prizesOf(current, id), nil
}
