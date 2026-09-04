package personal

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *PersonalService) History(ctx context.Context, actor models.Actor,
	page models.Page) ([]dto.HistoryItem, int64, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, 0, err
	}

	items, ids, total, err := s.history.List(ctx, userID, page)
	if err != nil {
		return nil, 0, err
	}
	if len(items) == 0 {
		return items, total, nil
	}

	outcomes, err := s.outcomes.ListByEvents(ctx, userID, ids)
	if err != nil {
		return nil, 0, err
	}
	artifacts, err := s.artifacts.ListByEvents(ctx, userID, ids)
	if err != nil {
		return nil, 0, err
	}
	counts, err := s.history.TaskCounts(ctx, userID, ids)
	if err != nil {
		return nil, 0, err
	}

	byEvent := make(map[uuid.UUID][]models.ParticipantArtifact, len(ids))
	for _, artifact := range artifacts {
		byEvent[artifact.EventID] = append(byEvent[artifact.EventID], artifact)
	}

	for i := range items {
		id := ids[i]
		if outcome, ok := outcomes[id]; ok {
			value := outcome
			items[i].Outcome = &value
		}
		if list, ok := byEvent[id]; ok {
			items[i].Artifacts = list
		}
		if count, ok := counts[id]; ok {
			items[i].TasksTotal = count[0]
			items[i].TasksDone = count[1]
		}
	}
	return items, total, nil
}
