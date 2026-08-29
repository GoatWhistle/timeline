package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *ResourceLinkService) ListPersonal(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) ([]models.ParticipantLink, error) {
	if actor.UserID == uuid.Nil {
		return nil, models.NewForbidden("the personal layer requires an authenticated user")
	}
	if _, err := s.readableEvent(ctx, actor, eventID); err != nil {
		return nil, err
	}
	return s.personal.ListByEvent(ctx, actor.UserID, eventID)
}

func (s *ResourceLinkService) CreatePersonal(ctx context.Context, actor models.Actor,
	eventID uuid.UUID, req models.CreateParticipantLinkRequest) (*models.ParticipantLink, error) {
	if actor.UserID == uuid.Nil {
		return nil, models.NewForbidden("the personal layer requires an authenticated user")
	}

	var link *models.ParticipantLink
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.readableEvent(ctx, actor, eventID); err != nil {
			return err
		}
		kind, err := parseLinkKind("kind", req.Kind)
		if err != nil {
			return err
		}
		url, err := validateURL("url", req.URL)
		if err != nil {
			return err
		}
		title, err := optionalText("title", req.Title, 200)
		if err != nil {
			return err
		}

		count, err := s.personal.CountByEvent(ctx, actor.UserID, eventID)
		if err != nil {
			return err
		}
		if count >= s.limits.MaxPersonalPerEvent {
			return models.NewConflict("participant_link_limit_reached",
				"the personal link limit for this event is reached")
		}

		sortOrder := 0
		if req.SortOrder != nil {
			sortOrder = *req.SortOrder
		} else if sortOrder, err = s.personal.NextSortOrder(ctx, actor.UserID, eventID); err != nil {
			return err
		}

		link, err = s.personal.Create(ctx, actor.UserID, eventID, kind, url, title, sortOrder)
		return err
	})
	if err != nil {
		return nil, err
	}
	return link, nil
}

func (s *ResourceLinkService) UpdatePersonal(ctx context.Context, actor models.Actor,
	id uuid.UUID, req models.UpdateParticipantLinkRequest) (*models.ParticipantLink, error) {
	if actor.UserID == uuid.Nil {
		return nil, models.NewForbidden("the personal layer requires an authenticated user")
	}

	var patch models.ParticipantLinkPatch
	if req.Kind != nil {
		kind, err := parseLinkKind("kind", *req.Kind)
		if err != nil {
			return nil, err
		}
		patch.Kind = &kind
	}
	if req.URL != nil {
		url, err := validateURL("url", *req.URL)
		if err != nil {
			return nil, err
		}
		patch.URL = &url
	}
	if req.ClearTitle {
		patch.TitleSet = true
	} else if req.Title != nil {
		title, err := optionalText("title", req.Title, 200)
		if err != nil {
			return nil, err
		}
		patch.Title = title
		patch.TitleSet = true
	}
	patch.SortOrder = req.SortOrder

	link, err := s.personal.Update(ctx, actor.UserID, id, patch)
	if err != nil {
		return nil, notFoundPersonal(err, "personal link")
	}
	return link, nil
}

func (s *ResourceLinkService) DeletePersonal(ctx context.Context, actor models.Actor,
	id uuid.UUID) error {
	if actor.UserID == uuid.Nil {
		return models.NewForbidden("the personal layer requires an authenticated user")
	}
	if err := s.personal.Delete(ctx, actor.UserID, id); err != nil {
		return notFoundPersonal(err, "personal link")
	}
	return nil
}
