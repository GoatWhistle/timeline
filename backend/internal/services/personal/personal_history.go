package personal

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *PersonalService) AddBookmark(ctx context.Context, actor models.Actor, eventID uuid.UUID) error {
	userID, err := s.owner(actor)
	if err != nil {
		return err
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		ev, err := s.events.GetByID(ctx, eventID)
		if err != nil {
			return validation.NotFoundOwned(err, "event")
		}
		if !ev.Schedulable() {
			return models.NewNotFound("event not found")
		}
		return s.bookmarks.Add(ctx, userID, eventID)
	})
}

func (s *PersonalService) RemoveBookmark(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) error {
	userID, err := s.owner(actor)
	if err != nil {
		return err
	}
	return validation.NotFoundOwned(s.bookmarks.Remove(ctx, userID, eventID), "bookmark")
}

func (s *PersonalService) ListBookmarks(ctx context.Context, actor models.Actor,
	page models.Page) ([]dto.CatalogEvent, int64, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, 0, err
	}
	return s.bookmarks.List(ctx, userID, page, s.now())
}

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
