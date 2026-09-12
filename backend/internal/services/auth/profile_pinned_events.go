package auth

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *ProfileService) PinnedEventDisplayIDs(ctx context.Context, u *models.User) ([]string, error) {
	if len(u.PinnedEventIDs) == 0 {
		return []string{}, nil
	}
	labels, err := s.events.LabelsByIDs(ctx, u.PinnedEventIDs)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(u.PinnedEventIDs))
	for _, id := range u.PinnedEventIDs {
		if label, ok := labels[id]; ok {
			out = append(out, label.DisplayID)
		}
	}
	return out, nil
}

func (s *ProfileService) resolvePinnedEvents(ctx context.Context, actor models.Actor,
	req dto.UpdateProfileRequest, patch *dto.ProfilePatch) error {
	if req.PinnedEventIDs == nil {
		return nil
	}
	if len(req.PinnedEventIDs) > models.ProfilePinnedEventsMax {
		return models.NewValidation("too many pinned events",
			models.FieldError{Field: "pinned_event_ids", Message: "at most 3 events can be pinned"})
	}
	ids := make([]uuid.UUID, 0, len(req.PinnedEventIDs))
	seen := make(map[uuid.UUID]bool, len(req.PinnedEventIDs))
	for _, raw := range req.PinnedEventIDs {
		parsed, err := dto.ParseDisplayID(dto.DisplayKindEvent, raw)
		if err != nil {
			return err
		}
		id, err := s.events.ResolveDisplayID(ctx, parsed.Value)
		if err != nil {
			return err
		}
		if seen[id] {
			continue
		}
		seen[id] = true
		ids = append(ids, id)
	}
	if len(ids) > 0 {
		valid, err := s.users.PinnableEventIDs(ctx, actor.UserID, ids)
		if err != nil {
			return err
		}
		validSet := make(map[uuid.UUID]bool, len(valid))
		for _, id := range valid {
			validSet[id] = true
		}
		for _, id := range ids {
			if !validSet[id] {
				return models.NewValidation("an event cannot be pinned",
					models.FieldError{Field: "pinned_event_ids",
						Message: "only your own shown, published events can be pinned"})
			}
		}
	}
	patch.PinnedEventIDs = ids
	return nil
}
