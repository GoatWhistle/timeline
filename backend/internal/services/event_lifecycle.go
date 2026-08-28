package services

import (
	"context"

	"github.com/google/uuid"

	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

func (s *EventService) Publish(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("publishing is restricted to administrators")
	}
	var published *models.Event
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if before.Archived() {
			return models.NewStateTransition("an archived event cannot be published")
		}
		if before.Published() {
			return models.NewStateTransition("event is already published")
		}
		published, err = s.events.Publish(ctx, id, s.now())
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditEventPublish, models.EntityEvent, id,
			map[string]any{"published_at": nil}, map[string]any{"published_at": published.PublishedAt})
	})
	if err != nil {
		return nil, err
	}

	s.reconcile(ctx, id)
	return published, nil
}

func (s *EventService) Archive(ctx context.Context, actor models.Actor, id uuid.UUID) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("archiving is restricted to administrators")
	}
	var archived *models.Event
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.events.GetForUpdate(ctx, id)
		if err != nil {
			return err
		}
		if before.Archived() {
			return models.NewStateTransition("event is already archived")
		}
		archived, err = s.events.Archive(ctx, id, s.now())
		if err != nil {
			return err
		}
		if err := s.notifier.CancelForEvent(ctx, id); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditEventArchive, models.EntityEvent, id,
			map[string]any{"archived_at": nil}, map[string]any{"archived_at": archived.ArchivedAt})
	})
	if err != nil {
		return nil, err
	}
	return archived, nil
}
