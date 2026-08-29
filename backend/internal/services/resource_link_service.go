package services

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
)

type ResourceLinkService struct {
	db           *postgres.DB
	links        *resourcelink.Links
	personal     *resourcelink.PersonalLinks
	events       *event.Events
	stages       *event.Stages
	participants *participation.Participants
	audit        *AuditService
	limits       config.ResourceLinks
	now          func() time.Time
}

func NewResourceLinkService(db *postgres.DB, links *resourcelink.Links,
	personal *resourcelink.PersonalLinks, events *event.Events, stages *event.Stages,
	participants *participation.Participants, audit *AuditService,
	limits config.ResourceLinks) *ResourceLinkService {
	return &ResourceLinkService{
		db: db, links: links, personal: personal, events: events, stages: stages,
		participants: participants, audit: audit, limits: limits,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *ResourceLinkService) List(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) ([]models.ResourceLink, error) {
	if _, err := s.readableEvent(ctx, actor, eventID); err != nil {
		return nil, err
	}
	return s.links.ListByEvent(ctx, eventID)
}

func (s *ResourceLinkService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req models.CreateResourceLinkRequest) (*models.ResourceLink, error) {
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
		url, err := validateURL("url", req.URL)
		if err != nil {
			return err
		}
		title, err := optionalText("title", req.Title, 200)
		if err != nil {
			return err
		}
		if err := s.checkStageOfEvent(ctx, eventID, req.StageID); err != nil {
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

		link, err = s.links.Create(ctx, eventID, req.StageID, kind, url, title, pinned, sortOrder)
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
	id uuid.UUID, req models.UpdateResourceLinkRequest) (*models.ResourceLink, error) {
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
			return notFoundPersonal(err, "resource link")
		}

		patch, err := resourceLinkPatch(req)
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
			return notFoundPersonal(err, "resource link")
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
			return notFoundPersonal(err, "resource link")
		}
		if err := s.links.Delete(ctx, eventID, id); err != nil {
			return notFoundPersonal(err, "resource link")
		}
		return s.audit.Record(ctx, actor, models.AuditLinkDelete,
			models.EntityResourceLink, id, before, nil)
	})
}
