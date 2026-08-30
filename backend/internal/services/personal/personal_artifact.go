package personal

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *PersonalService) ListArtifacts(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) ([]models.ParticipantArtifact, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}
	if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
		return nil, err
	}
	return s.artifacts.ListByEvent(ctx, userID, eventID)
}

func (s *PersonalService) CreateArtifact(ctx context.Context, actor models.Actor,
	eventID uuid.UUID, req dto.CreateArtifactRequest) (*models.ParticipantArtifact, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}

	var artifact *models.ParticipantArtifact
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
			return err
		}
		if !req.Kind.Valid() {
			return models.NewValidation("invalid artifact kind",
				models.FieldError{Field: "kind",
					Message: "allowed values are REPOSITORY, VIDEO, SLIDES, DEMO, SUBMISSION and OTHER"})
		}
		url, err := validation.ValidateURL("url", req.URL)
		if err != nil {
			return err
		}
		title, err := validation.OptionalText("title", req.Title, 200)
		if err != nil {
			return err
		}

		count, err := s.artifacts.CountByEvent(ctx, userID, eventID)
		if err != nil {
			return err
		}
		if count >= s.limits.MaxArtifactsPerEvent {
			return models.NewConflict("artifact_limit_reached",
				"the artifact limit for this event is reached")
		}

		sortOrder := 0
		if req.SortOrder != nil {
			sortOrder = *req.SortOrder
		} else if sortOrder, err = s.artifacts.NextSortOrder(ctx, userID, eventID); err != nil {
			return err
		}

		artifact, err = s.artifacts.Create(ctx, userID, eventID, req.Kind, url, title, sortOrder)
		return err
	})
	if err != nil {
		return nil, err
	}
	return artifact, nil
}

func (s *PersonalService) UpdateArtifact(ctx context.Context, actor models.Actor,
	artifactID uuid.UUID, req dto.UpdateArtifactRequest) (*models.ParticipantArtifact, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}
	patch, err := artifactPatch(req)
	if err != nil {
		return nil, err
	}
	artifact, err := s.artifacts.Update(ctx, userID, artifactID, patch)
	if err != nil {
		return nil, validation.NotFoundOwned(err, "artifact")
	}
	return artifact, nil
}

func (s *PersonalService) DeleteArtifact(ctx context.Context, actor models.Actor,
	artifactID uuid.UUID) error {
	userID, err := s.owner(actor)
	if err != nil {
		return err
	}
	return validation.NotFoundOwned(s.artifacts.Delete(ctx, userID, artifactID), "artifact")
}

func (s *PersonalService) GetOutcome(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*models.ParticipantOutcome, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}
	if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
		return nil, err
	}
	outcome, err := s.outcomes.Get(ctx, userID, eventID)
	if errors.Is(err, models.ErrNotFound) {
		return nil, models.NewNotFound("outcome not found")
	}
	if err != nil {
		return nil, err
	}
	return outcome, nil
}

func (s *PersonalService) SaveOutcome(ctx context.Context, actor models.Actor,
	eventID uuid.UUID, req dto.SaveOutcomeRequest) (*models.ParticipantOutcome, error) {
	userID, err := s.owner(actor)
	if err != nil {
		return nil, err
	}

	var outcome *models.ParticipantOutcome
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.visibleEvent(ctx, userID, eventID); err != nil {
			return err
		}
		value := models.OutcomeParticipated
		if req.Outcome != nil {
			value = *req.Outcome
		}
		if !value.Valid() {
			return models.NewValidation("invalid outcome",
				models.FieldError{Field: "outcome",
					Message: "allowed values are PARTICIPATED, SHORTLISTED, WINNER and PRIZE"})
		}
		if req.Place != nil {
			if !value.AllowsPlace() {
				return models.NewValidation("a place requires a placing outcome",
					models.FieldError{Field: "place",
						Message: "a place is allowed only with SHORTLISTED, WINNER or PRIZE"})
			}
			if *req.Place < 1 || *req.Place > 10000 {
				return models.NewValidation("the place is out of range",
					models.FieldError{Field: "place", Message: "the place must be between 1 and 10000"})
			}
		}
		prize, err := validation.OptionalText("prize", req.Prize, 200)
		if err != nil {
			return err
		}
		track, err := validation.OptionalText("track", req.Track, 120)
		if err != nil {
			return err
		}
		if err := validateNotes(req.Note, s.limits.MaxNoteLength); err != nil {
			return err
		}

		outcome, err = s.outcomes.Save(ctx, userID, eventID, value, req.Place, prize, track, req.Note)
		return err
	})
	if err != nil {
		return nil, err
	}
	return outcome, nil
}

func (s *PersonalService) DeleteOutcome(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) error {
	userID, err := s.owner(actor)
	if err != nil {
		return err
	}
	return validation.NotFoundOwned(s.outcomes.Delete(ctx, userID, eventID), "outcome")
}

func artifactPatch(req dto.UpdateArtifactRequest) (dto.ArtifactPatch, error) {
	var patch dto.ArtifactPatch
	if req.Kind != nil {
		if !req.Kind.Valid() {
			return patch, models.NewValidation("invalid artifact kind",
				models.FieldError{Field: "kind",
					Message: "allowed values are REPOSITORY, VIDEO, SLIDES, DEMO, SUBMISSION and OTHER"})
		}
		patch.Kind = req.Kind
	}
	if req.URL != nil {
		url, err := validation.ValidateURL("url", *req.URL)
		if err != nil {
			return patch, err
		}
		patch.URL = &url
	}
	switch {
	case req.ClearTitle:
		patch.TitleSet = true
	case req.Title != nil:
		title, err := validation.OptionalText("title", req.Title, 200)
		if err != nil {
			return patch, err
		}
		patch.Title = title
		patch.TitleSet = true
	}
	patch.SortOrder = req.SortOrder
	patch.Submitted = req.Submitted
	return patch, nil
}
