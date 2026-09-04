package event

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *EventService) Update(ctx context.Context, actor models.Actor, id uuid.UUID, req dto.UpdateEventRequest,
) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("editing an event is restricted to administrators")
	}
	if err := normalizeUpdateText(&req); err != nil {
		return nil, err
	}

	var (
		updated       *models.Event
		scheduleReset bool
		websiteMoved  bool
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if before.Archived() {
			return models.NewStateTransition("an archived event cannot be modified")
		}
		place, err := resolveUpdateFields(&req, before)
		if err != nil {
			return err
		}
		if err := s.checkPoolCoversTracks(ctx, id, req.PrizePool); err != nil {
			return err
		}

		updated, err = s.events.Update(ctx, id, req, dto.EventPlacePatch{
			CountrySet: true, CountryCode: place.countryCode,
			CitySet: true, City: place.city,
		})
		if err != nil {
			return err
		}
		websiteMoved = websiteChanged(before.WebsiteURL, updated.WebsiteURL)

		scheduleReset, err = s.applyUpdateEffects(ctx, id, before, updated)
		if err != nil {
			return err
		}

		return s.audit.Record(ctx, actor, models.AuditEventUpdate, models.EntityEvent, id,
			map[string]any{"title": before.Title, "start_at": before.StartAt, "end_at": before.EndAt},
			map[string]any{"title": updated.Title, "start_at": updated.StartAt, "end_at": updated.EndAt})
	})
	if err != nil {
		return nil, err
	}

	if scheduleReset {
		s.reconcile(ctx, id)
	}
	if websiteMoved {
		s.refreshCover(ctx, id, updated.WebsiteURL)
	}
	return updated, nil
}

func (s *EventService) applyUpdateEffects(ctx context.Context, id uuid.UUID,
	before, updated *models.Event) (bool, error) {
	if err := s.repaintOnOriginChange(ctx, id, before.Origin, updated); err != nil {
		return false, err
	}
	if updated.EndAt.Equal(before.EndAt) {
		return false, nil
	}
	return s.resetSchedule(ctx, id)
}

func normalizeUpdateText(req *dto.UpdateEventRequest) error {
	if req.Title != nil {
		title, err := validation.ValidateText("title", *req.Title, 1, 200)
		if err != nil {
			return err
		}
		req.Title = &title
	}
	if req.WebsiteURL != nil && *req.WebsiteURL != "" {
		website, err := validation.ValidateURL("website_url", *req.WebsiteURL)
		if err != nil {
			return err
		}
		req.WebsiteURL = &website
	}
	return nil
}

func resolveUpdateFields(req *dto.UpdateEventRequest, before *models.Event) (resolvedPlace, error) {
	start := before.StartAt
	if req.StartAt != nil {
		start = req.StartAt.UTC()
	}
	end := before.EndAt
	if req.EndAt != nil {
		end = req.EndAt.UTC()
	}
	if !end.After(start) {
		return resolvedPlace{}, models.NewValidation("event end must be later than its start",
			models.FieldError{Field: "end_at", Message: "must be later than start_at"})
	}

	if err := requireSameKind(req.Kind, before.Kind); err != nil {
		return resolvedPlace{}, err
	}

	place, err := resolvePlace(req.Kind, req.Format, req.Origin, req.CountryCode, req.City,
		resolvedPlace{kind: before.Kind, format: before.Format, origin: before.Origin,
			countryCode: before.CountryCode, city: before.City})
	if err != nil {
		return resolvedPlace{}, err
	}
	prize, err := resolvePrize(req.PrizePool, req.PrizeCurrency,
		prizeAmount{pool: before.PrizePool, currency: before.PrizeCurrency})
	if err != nil {
		return resolvedPlace{}, err
	}
	req.PrizePool, req.PrizeCurrency = prize.pool, prize.currency
	if err := validateTeamSize(
		coalesceSize(req.TeamSizeMin, before.TeamSizeMin),
		coalesceSize(req.TeamSizeMax, before.TeamSizeMax)); err != nil {
		return resolvedPlace{}, err
	}
	return place, nil
}

func requireSameKind(requested *models.EventKind, current models.EventKind) error {
	if requested == nil || *requested == current {
		return nil
	}
	return models.NewStateTransition("the kind of an event is fixed once it is created")
}

func (s *EventService) resetSchedule(ctx context.Context, id uuid.UUID) (bool, error) {
	registration, err := s.registrations.GetByEventForUpdate(ctx, id)
	switch {
	case err == nil:
		if _, err := s.registrations.BumpScheduleVersion(ctx, registration.ID); err != nil {
			return false, err
		}
		if err := s.notifier.CancelForRegistration(ctx, registration.ID); err != nil {
			return false, err
		}
		return true, nil
	case errors.Is(err, models.ErrNotFound):
		return false, nil
	}
	return false, err
}

func websiteChanged(before, after *string) bool {
	if before == nil || after == nil {
		return before != after
	}
	return *before != *after
}

func (s *EventService) checkPoolCoversTracks(ctx context.Context, id uuid.UUID,
	pool *string) error {
	distributed, err := s.tracks.DistributedTotal(ctx, id, nil)
	if err != nil {
		return err
	}
	total, err := parseWholeAmount("prizes", distributed)
	if err != nil {
		return err
	}
	if total == 0 {
		return nil
	}
	return checkPoolCoverage(pool, "0", total)
}
