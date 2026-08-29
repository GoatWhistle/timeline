package event

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func parseLinkKind(field, value string) (models.LinkKind, error) {
	kind := models.LinkKind(strings.ToUpper(strings.TrimSpace(value)))
	if !kind.Valid() {
		return "", models.NewValidation("invalid link kind",
			models.FieldError{Field: field, Message: "value is not allowed"})
	}
	return kind, nil
}

func (s *ResourceLinkService) readableEvent(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*models.Event, error) {
	ev, err := s.events.GetByID(ctx, eventID)
	if errors.Is(err, models.ErrNotFound) {
		return nil, models.NewNotFound("event not found")
	}
	if err != nil {
		return nil, err
	}
	if actor.IsAdmin {
		return ev, nil
	}
	if ev.Schedulable() {
		return ev, nil
	}
	participant, err := s.participants.GetByEventUser(ctx, eventID, actor.UserID)
	if err != nil || !participant.Assigned() {
		return nil, models.NewNotFound("event not found")
	}
	return ev, nil
}

func (s *ResourceLinkService) checkStageOfEvent(ctx context.Context, eventID uuid.UUID,
	stageID *uuid.UUID) error {
	if stageID == nil {
		return nil
	}
	stage, err := s.stages.GetByID(ctx, *stageID)
	if errors.Is(err, models.ErrNotFound) {
		return models.NewNotFound("stage not found")
	}
	if err != nil {
		return err
	}
	if stage.EventID != eventID {
		return models.NewValidation("the stage belongs to another event",
			models.FieldError{Field: "stage_id", Message: "the stage must belong to the same event"})
	}
	return nil
}

func resourceLinkPatch(req models.UpdateResourceLinkRequest,
	stageID *uuid.UUID) (models.ResourceLinkPatch, error) {
	var patch models.ResourceLinkPatch
	if req.Kind != nil {
		kind, err := parseLinkKind("kind", *req.Kind)
		if err != nil {
			return patch, err
		}
		patch.Kind = &kind
	}
	if req.URL != nil {
		url, err := validation.ValidateURL("url", *req.URL)
		if err != nil {
			return patch, err
		}
		patch.URL = &url
	}
	if req.ClearTitle {
		patch.TitleSet = true
	} else if req.Title != nil {
		title, err := validation.OptionalText("title", req.Title, 200)
		if err != nil {
			return patch, err
		}
		patch.Title = title
		patch.TitleSet = true
	}
	if req.ClearStage {
		patch.StageSet = true
	} else if stageID != nil {
		patch.StageID = stageID
		patch.StageSet = true
	}
	patch.IsPinned = req.IsPinned
	patch.SortOrder = req.SortOrder
	return patch, nil
}
