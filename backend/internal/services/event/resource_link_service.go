package event

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/resourcelink"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type ResourceLinkService struct {
	db           *postgres.DB
	links        *resourcelink.Links
	events       *event.Events
	stages       *event.Stages
	participants *participation.Participants
	audit        *audit.AuditService
	limits       config.ResourceLinks
	now          func() time.Time
}

func NewResourceLinkService(db *postgres.DB, links *resourcelink.Links,
	events *event.Events, stages *event.Stages,
	participants *participation.Participants, audit *audit.AuditService,
	limits config.ResourceLinks) *ResourceLinkService {
	return &ResourceLinkService{
		db: db, links: links, events: events, stages: stages,
		participants: participants, audit: audit, limits: limits,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *ResourceLinkService) ResolveEventDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.events.ResolveDisplayID(ctx, displayID)
}

func (s *ResourceLinkService) List(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) ([]models.ResourceLink, error) {
	if _, err := s.readableEvent(ctx, actor, eventID); err != nil {
		return nil, err
	}
	return s.links.ListByEvent(ctx, eventID)
}

func (s *ResourceLinkService) ResolveLinkDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.links.ResolveDisplayID(ctx, displayID)
}

func (s *ResourceLinkService) ResolveStageDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.stages.ResolveDisplayID(ctx, displayID)
}

func (s *ResourceLinkService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req dto.CreateResourceLinkRequest, stageID *uuid.UUID) (*models.ResourceLink, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}

	var link *models.ResourceLink
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.readableEvent(ctx, actor, eventID); err != nil {
			return err
		}
		kind, err := parseLinkKind("kind", req.Kind)
		if err != nil {
			return err
		}
		url, err := validation.ValidateURL("url", req.URL)
		if err != nil {
			return err
		}
		title, err := validation.OptionalText("title", req.Title, 200)
		if err != nil {
			return err
		}
		if err := s.checkStageOfEvent(ctx, eventID, stageID); err != nil {
			return err
		}

		count, err := s.links.CountByEvent(ctx, eventID)
		if err != nil {
			return err
		}
		if count >= s.limits.MaxPerEvent {
			return models.NewConflict("resource_link_limit_reached",
				"the resource link limit for this event is reached")
		}

		pinned := false
		if req.IsPinned != nil {
			pinned = *req.IsPinned
		}
		sortOrder := 0
		if req.SortOrder != nil {
			sortOrder = *req.SortOrder
		} else if sortOrder, err = s.links.NextSortOrder(ctx, eventID); err != nil {
			return err
		}

		link, err = s.links.Create(ctx, eventID, stageID, kind, url, title, pinned, sortOrder)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditLinkCreate,
			models.EntityResourceLink, link.ID, nil, link)
	})
	if err != nil {
		return nil, err
	}
	return link, nil
}

func (s *ResourceLinkService) Update(ctx context.Context, actor models.Actor, eventID,
	id uuid.UUID, req dto.UpdateResourceLinkRequest, stageID *uuid.UUID) (*models.ResourceLink, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}

	var link *models.ResourceLink
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.readableEvent(ctx, actor, eventID); err != nil {
			return err
		}
		before, err := s.links.Get(ctx, eventID, id)
		if err != nil {
			return validation.NotFoundOwned(err, "resource link")
		}

		patch, err := resourceLinkPatch(req, stageID)
		if err != nil {
			return err
		}
		if patch.StageSet {
			if err := s.checkStageOfEvent(ctx, eventID, patch.StageID); err != nil {
				return err
			}
		}

		link, err = s.links.Update(ctx, eventID, id, patch)
		if err != nil {
			return validation.NotFoundOwned(err, "resource link")
		}
		return s.audit.Record(ctx, actor, models.AuditLinkUpdate,
			models.EntityResourceLink, id, before, link)
	})
	if err != nil {
		return nil, err
	}
	return link, nil
}

func (s *ResourceLinkService) Delete(ctx context.Context, actor models.Actor,
	eventID, id uuid.UUID) error {
	if !actor.IsAdmin {
		return models.NewForbidden("the operation is restricted to administrators")
	}
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.readableEvent(ctx, actor, eventID); err != nil {
			return err
		}
		before, err := s.links.Get(ctx, eventID, id)
		if err != nil {
			return validation.NotFoundOwned(err, "resource link")
		}
		if err := s.links.Delete(ctx, eventID, id); err != nil {
			return validation.NotFoundOwned(err, "resource link")
		}
		return s.audit.Record(ctx, actor, models.AuditLinkDelete,
			models.EntityResourceLink, id, before, nil)
	})
}
