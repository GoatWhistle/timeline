package services

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *PersonalService) GetRetrospective(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*models.ParticipantRetrospective, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}
	if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
		return nil, err
	}
	item, err := s.retros.Get(ctx, userID, eventID)
	if errors.Is(err, models.ErrNotFound) {
		return s.retros.Empty(eventID), nil
	}
	if err != nil {
		return nil, err
	}
	return item, nil
}

func (s *PersonalService) SaveRetrospective(ctx context.Context, actor models.Actor,
	eventID uuid.UUID, req models.SaveRetrospectiveRequest) (*models.ParticipantRetrospective, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}

	var item *models.ParticipantRetrospective
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
			return err
		}
		wentWell, err := s.retrospectiveField("went_well", req.WentWell)
		if err != nil {
			return err
		}
		wentBadly, err := s.retrospectiveField("went_badly", req.WentBadly)
		if err != nil {
			return err
		}
		nextTime, err := s.retrospectiveField("next_time", req.NextTime)
		if err != nil {
			return err
		}
		if wentWell == nil && wentBadly == nil && nextTime == nil {
			if err := s.retros.Delete(ctx, userID, eventID); err != nil {
				return err
			}
			item = s.retros.Empty(eventID)
			return nil
		}
		item, err = s.retros.Save(ctx, userID, eventID, wentWell, wentBadly, nextTime)
		return err
	})
	if err != nil {
		return nil, err
	}
	return item, nil
}

func (s *PersonalService) DeleteRetrospective(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) error {
	userID, err := s.owner(actor)
	if err != nil {
		return err
	}
	if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
		return err
	}
	return s.retros.Delete(ctx, userID, eventID)
}

func (s *PersonalService) retrospectiveField(field string, value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	if len([]rune(trimmed)) > s.limits.MaxNoteLength {
		return nil, models.NewValidation("the retrospective field is too long",
			models.FieldError{Field: field,
				Message: "at most " + itoa(s.limits.MaxNoteLength) + " characters"})
	}
	return &trimmed, nil
}
