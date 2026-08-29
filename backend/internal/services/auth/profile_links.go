package auth

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type ProfileLinkService struct {
	db    *postgres.DB
	links *identity.ProfileLinks
}

func NewProfileLinkService(db *postgres.DB, links *identity.ProfileLinks) *ProfileLinkService {
	return &ProfileLinkService{db: db, links: links}
}

func (s *ProfileLinkService) List(ctx context.Context, userID uuid.UUID) ([]models.ProfileLink, error) {
	return s.links.ListByUser(ctx, userID)
}

func (s *ProfileLinkService) Create(ctx context.Context, actor models.Actor,
	req models.CreateProfileLinkRequest) (*models.ProfileLink, error) {
	url, err := validation.ProfileLinkURL("url", req.URL)
	if err != nil {
		return nil, err
	}
	label, err := validation.ProfileLinkLabel(req.Label)
	if err != nil {
		return nil, err
	}

	var created *models.ProfileLink
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		count, err := s.links.CountByUser(ctx, actor.UserID)
		if err != nil {
			return err
		}
		if count >= models.ProfileLinkMaxPerUser {
			return models.NewConflict("profile_link_limit",
				"the profile already holds the maximum number of links")
		}
		created, err = s.links.Create(ctx, actor.UserID, url, label)
		return err
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (s *ProfileLinkService) Update(ctx context.Context, actor models.Actor, id uuid.UUID,
	req models.UpdateProfileLinkRequest) (*models.ProfileLink, error) {
	patch, err := validation.ProfileLinkPatch(req)
	if err != nil {
		return nil, err
	}
	return s.links.Update(ctx, actor.UserID, id, patch)
}

func (s *ProfileLinkService) Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	return s.links.Delete(ctx, actor.UserID, id)
}

func (s *ProfileLinkService) Reorder(ctx context.Context, actor models.Actor,
	req models.ReorderProfileLinksRequest) ([]models.ProfileLink, error) {
	if len(req.IDs) == 0 {
		return nil, models.NewValidation("the order is empty",
			models.FieldError{Field: "ids", Message: "at least one identifier is required"})
	}
	if len(req.IDs) > models.ProfileLinkMaxPerUser {
		return nil, models.NewValidation("too many identifiers",
			models.FieldError{Field: "ids", Message: "more identifiers than links are allowed"})
	}
	seen := make(map[uuid.UUID]bool, len(req.IDs))
	for _, id := range req.IDs {
		if seen[id] {
			return nil, models.NewValidation("the order repeats an identifier",
				models.FieldError{Field: "ids", Message: "identifiers must be unique"})
		}
		seen[id] = true
	}

	var items []models.ProfileLink
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		count, err := s.links.CountByUser(ctx, actor.UserID)
		if err != nil {
			return err
		}
		if count != len(req.IDs) {
			return models.NewValidation("the order must list every link",
				models.FieldError{Field: "ids", Message: "every link of the profile must be listed once"})
		}
		if err := s.links.Reorder(ctx, actor.UserID, req.IDs); err != nil {
			return err
		}
		items, err = s.links.ListByUser(ctx, actor.UserID)
		return err
	})
	if err != nil {
		return nil, err
	}
	return items, nil
}
