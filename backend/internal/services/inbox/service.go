package inbox

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/inbox"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Service struct {
	repo     *inbox.Items
	registry RegistrationMarker
	notifier Notifier
	now      func() time.Time
}

func NewService(repo *inbox.Items, registry RegistrationMarker) *Service {
	return &Service{repo: repo, registry: registry, now: func() time.Time { return time.Now().UTC() }}
}

func (s *Service) WithNotifier(notifier Notifier) { s.notifier = notifier }

func (s *Service) notify(ctx context.Context, userID uuid.UUID) {
	if s.notifier == nil {
		return
	}
	if err := s.notifier.NotifyInbox(ctx, userID); err != nil {
		slog.WarnContext(ctx, "failed to publish an inbox unread-count invalidation",
			"error", err, "user_id", userID)
	}
}


func externalSubjectID(it *models.InboxItem) string {
	if it.SubjectType == nil || it.SubjectID == nil {
		return ""
	}
	for _, a := range it.Actions {
		if a.Kind == models.InboxActionOpen && a.Href != nil && *a.Href != "" {
			return *a.Href
		}
	}
	return ""
}

func toResponse(it *models.InboxItem) dto.InboxItemResponse {
	resp := dto.InboxItemResponse{
		ID:         dto.NewDisplayID(dto.DisplayKindInboxItem, it.DisplayID).String(),
		Kind:       it.Kind,
		Title:      it.Title,
		BodyMD:     it.BodyMD,
		Actions:    make([]dto.InboxAction, 0, len(it.Actions)),
		ReadAt:     it.ReadAt,
		DeletedAt:  it.DeletedAt,
		LogicalKey: it.LogicalKey,
		CreatedAt:  it.CreatedAt,
	}
	if external := externalSubjectID(it); external != "" {
		resp.Subject = &dto.InboxSubject{Kind: *it.SubjectType, ID: external}
	}
	for _, a := range it.Actions {
		action := dto.InboxAction{Kind: string(a.Kind)}
		if a.Href != nil {
			href := *a.Href
			action.Href = &href
		}
		resp.Actions = append(resp.Actions, action)
	}
	return resp
}

func (s *Service) List(ctx context.Context, actor models.Actor, unreadOnly bool,
	page models.Page) ([]dto.InboxItemResponse, int64, error) {
	if actor.IsSystem() {
		return nil, 0, models.NewUnauthorized("authentication is required")
	}
	items, total, err := s.repo.List(ctx, actor.UserID, unreadOnly, page)
	if err != nil {
		return nil, 0, err
	}
	out := make([]dto.InboxItemResponse, 0, len(items))
	for i := range items {
		out = append(out, toResponse(&items[i]))
	}
	return out, total, nil
}

func (s *Service) UnreadCount(ctx context.Context, actor models.Actor) (int64, error) {
	if actor.IsSystem() {
		return 0, models.NewUnauthorized("authentication is required")
	}
	return s.repo.UnreadCount(ctx, actor.UserID)
}

func (s *Service) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.repo.ResolveDisplayID(ctx, displayID)
}

const markReadBatchMax = 200

func (s *Service) MarkRead(ctx context.Context, actor models.Actor, ids []uuid.UUID) (int64, error) {
	if actor.IsSystem() {
		return 0, models.NewUnauthorized("authentication is required")
	}
	var affected int64
	var err error
	if len(ids) == 0 {
		affected, err = s.repo.MarkAllRead(ctx, actor.UserID, s.now())
	} else if len(ids) > markReadBatchMax {
		return 0, models.NewValidation("at most 200 identifiers per request")
	} else {
		affected, err = s.repo.MarkRead(ctx, actor.UserID, ids, s.now())
	}
	if err != nil {
		return 0, err
	}
	if affected > 0 {
		s.notify(ctx, actor.UserID)
	}
	return affected, nil
}

func (s *Service) Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	if actor.IsSystem() {
		return models.NewUnauthorized("authentication is required")
	}
	affected, err := s.repo.SoftDelete(ctx, actor.UserID, []uuid.UUID{id}, s.now())
	if err != nil {
		return err
	}
	if affected == 0 {
		return models.NewNotFound("inbox item not found")
	}
	s.notify(ctx, actor.UserID)
	return nil
}

func (s *Service) DeleteAll(ctx context.Context, actor models.Actor, readOnly bool) (int64, error) {
	if actor.IsSystem() {
		return 0, models.NewUnauthorized("authentication is required")
	}
	affected, err := s.repo.SoftDeleteAll(ctx, actor.UserID, readOnly, s.now())
	if err != nil {
		return 0, err
	}
	if affected > 0 {
		s.notify(ctx, actor.UserID)
	}
	return affected, nil
}

func (s *Service) Restore(ctx context.Context, actor models.Actor, id uuid.UUID) (dto.InboxItemResponse, error) {
	if actor.IsSystem() {
		return dto.InboxItemResponse{}, models.NewUnauthorized("authentication is required")
	}
	restored, err := s.repo.Restore(ctx, actor.UserID, id)
	if err != nil {
		if isNotFound(err) {
			return dto.InboxItemResponse{}, models.NewNotFound("inbox item not found")
		}
		return dto.InboxItemResponse{}, err
	}
	s.notify(ctx, actor.UserID)
	return toResponse(restored), nil
}

func isNotFound(err error) bool {
	return errors.Is(err, models.ErrNotFound)
}

func (s *Service) MarkRegistered(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	if actor.IsSystem() {
		return models.NewUnauthorized("authentication is required")
	}
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return models.NewNotFound("inbox item not found")
	}
	if item.RecipientUserID != actor.UserID || item.SoftDeleted() {
		return models.NewNotFound("inbox item not found")
	}
	if item.SubjectType == nil || *item.SubjectType != "event" || item.SubjectID == nil {
		return models.NewValidation("this inbox item has no registration action")
	}
	if s.registry == nil {
		return models.NewValidation("this inbox item has no registration action")
	}
	_, err = s.registry.MarkDone(ctx, actor, *item.SubjectID)
	return err
}

func (s *Service) Cleanup(ctx context.Context, deletedRetention time.Duration) (int64, error) {
	return s.repo.PurgeDeletedBefore(ctx, s.now().Add(-deletedRetention))
}

func (s *Service) Create(ctx context.Context, item *models.InboxItem) error {
	_, inserted, err := s.repo.Insert(ctx, item)
	if err != nil {
		return err
	}
	if inserted {
		s.notify(ctx, item.RecipientUserID)
	}
	return nil
}
