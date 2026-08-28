package services

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (s *PersonalService) GetNote(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*models.ParticipantNote, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}
	if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
		return nil, err
	}
	note, err := s.notes.Get(ctx, userID, eventID)
	if errors.Is(err, models.ErrNotFound) {
		return s.notes.Empty(eventID), nil
	}
	if err != nil {
		return nil, err
	}
	return note, nil
}

func (s *PersonalService) SaveNote(ctx context.Context, actor models.Actor,
	eventID uuid.UUID, req models.SaveNoteRequest) (*models.ParticipantNote, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}

	var note *models.ParticipantNote
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
			return err
		}
		body := strings.TrimSpace(req.Body)
		if body == "" {
			if err := s.notes.Delete(ctx, userID, eventID); err != nil {
				return err
			}
			note = s.notes.Empty(eventID)
			return nil
		}
		if len([]rune(body)) > s.limits.MaxNoteLength {
			return models.NewValidation("the note is too long",
				models.FieldError{Field: "body",
					Message: "at most " + itoa(s.limits.MaxNoteLength) + " characters"})
		}
		note, err = s.notes.Save(ctx, userID, eventID, body)
		return err
	})
	if err != nil {
		return nil, err
	}
	return note, nil
}
