package team

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

func (s *TeamService) entryForMember(ctx context.Context, actor models.Actor,
	teamID, eventID uuid.UUID) (*models.TeamEventEntry, error) {
	if _, err := s.visible(ctx, actor, teamID); err != nil {
		return nil, err
	}
	return s.entries.GetByTeamEvent(ctx, teamID, eventID)
}

func (s *TeamService) writableEntry(ctx context.Context, actor models.Actor,
	teamID, eventID uuid.UUID) (*models.TeamEventEntry, error) {
	entry, err := s.entryForMember(ctx, actor, teamID, eventID)
	if err != nil {
		return nil, err
	}
	if err := s.activeMemberOnly(ctx, actor, teamID); err != nil {
		return nil, err
	}
	return entry, nil
}

func (s *TeamService) activeMemberOnly(ctx context.Context, actor models.Actor,
	teamID uuid.UUID) error {
	membership, err := s.members.GetByTeamUser(ctx, teamID, actor.UserID)
	switch {
	case errors.Is(err, models.ErrNotFound):
		return models.NewNotFound("team not found")
	case err != nil:
		return err
	case membership.State != models.TeamMemberActive:
		return models.NewForbidden("only an active team member may change the team links")
	}
	return nil
}

func (s *TeamService) linkEntry(ctx context.Context, actor models.Actor,
	linkID uuid.UUID) (*models.TeamEventLink, *models.TeamEventEntry, error) {
	link, err := s.eventLinks.GetByID(ctx, linkID)
	if err != nil {
		return nil, nil, models.NewNotFound("team link not found")
	}
	entry, err := s.entries.GetByID(ctx, link.EntryID)
	if err != nil {
		return nil, nil, models.NewNotFound("team link not found")
	}
	if _, err := s.visible(ctx, actor, entry.TeamID); err != nil {
		return nil, nil, models.NewNotFound("team link not found")
	}
	if err := s.activeMemberOnly(ctx, actor, entry.TeamID); err != nil {
		return nil, nil, err
	}
	return link, entry, nil
}

func (s *TeamService) ListEventLinks(ctx context.Context, actor models.Actor,
	teamID, eventID uuid.UUID) (*dto.TeamEventLinkListResponse, error) {
	entry, err := s.entryForMember(ctx, actor, teamID, eventID)
	if err != nil {
		return nil, err
	}
	items, err := s.eventLinks.ListByEntry(ctx, entry.ID)
	if err != nil {
		return nil, err
	}
	canWrite := s.activeMemberOnly(ctx, actor, teamID) == nil
	return &dto.TeamEventLinkListResponse{Items: items, CanWrite: canWrite}, nil
}

func (s *TeamService) AddEventLink(ctx context.Context, actor models.Actor,
	teamID, eventID uuid.UUID, req dto.CreateTeamEventLinkRequest) (*models.TeamEventLink, error) {
	url, err := validation.ProfileLinkURL("url", req.URL)
	if err != nil {
		return nil, err
	}
	label, err := validation.ProfileLinkLabel(req.Label)
	if err != nil {
		return nil, err
	}

	var created *models.TeamEventLink
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		entry, err := s.writableEntry(ctx, actor, teamID, eventID)
		if err != nil {
			return err
		}
		count, err := s.eventLinks.CountByEntry(ctx, entry.ID)
		if err != nil {
			return err
		}
		if count >= models.TeamEventLinkMaxPerEntry {
			return models.NewConflict("team_event_link_limit",
				"the team already holds the maximum number of links for this event")
		}
		created, err = s.eventLinks.Create(ctx, entry.ID, actor.UserID, url, label)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamEventLinkAdd,
			models.EntityTeamEventLink, created.ID, nil,
			map[string]any{"entry_id": entry.ID, "url": created.URL})
	})
	if err != nil {
		return nil, err
	}
	return created, nil
}

func (s *TeamService) UpdateEventLink(ctx context.Context, actor models.Actor, linkID uuid.UUID,
	req dto.UpdateTeamEventLinkRequest) (*models.TeamEventLink, error) {
	patch, err := validation.TeamEventLinkPatch(req)
	if err != nil {
		return nil, err
	}

	var updated *models.TeamEventLink
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		existing, _, err := s.linkEntry(ctx, actor, linkID)
		if err != nil {
			return err
		}
		updated, err = s.eventLinks.Update(ctx, linkID, patch)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamEventLinkUpdate,
			models.EntityTeamEventLink, linkID,
			map[string]any{"url": existing.URL}, map[string]any{"url": updated.URL})
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *TeamService) RemoveEventLink(ctx context.Context, actor models.Actor,
	linkID uuid.UUID) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		existing, _, err := s.linkEntry(ctx, actor, linkID)
		if err != nil {
			return err
		}
		if err := s.eventLinks.Delete(ctx, linkID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamEventLinkRemove,
			models.EntityTeamEventLink, linkID,
			map[string]any{"url": existing.URL}, nil)
	})
}

func (s *TeamService) ReorderEventLinks(ctx context.Context, actor models.Actor,
	teamID, eventID uuid.UUID, ids []uuid.UUID) (*dto.TeamEventLinkListResponse, error) {
	if len(ids) == 0 {
		return nil, models.NewValidation("the order is empty",
			models.FieldError{Field: "ids", Message: "at least one identifier is required"})
	}
	seen := make(map[uuid.UUID]bool, len(ids))
	for _, id := range ids {
		if seen[id] {
			return nil, models.NewValidation("the order repeats an identifier",
				models.FieldError{Field: "ids", Message: "identifiers must be unique"})
		}
		seen[id] = true
	}

	var items []models.TeamEventLink
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		entry, err := s.writableEntry(ctx, actor, teamID, eventID)
		if err != nil {
			return err
		}
		count, err := s.eventLinks.CountByEntry(ctx, entry.ID)
		if err != nil {
			return err
		}
		if count != len(ids) {
			return models.NewValidation("the order must list every link",
				models.FieldError{Field: "ids", Message: "every link of the entry must be listed once"})
		}
		if err := s.eventLinks.Reorder(ctx, entry.ID, ids); err != nil {
			return models.NewNotFound("team link not found")
		}
		items, err = s.eventLinks.ListByEntry(ctx, entry.ID)
		return err
	})
	if err != nil {
		return nil, err
	}
	return &dto.TeamEventLinkListResponse{Items: items, CanWrite: true}, nil
}

func (s *TeamService) ResolveTeamEventLinkDisplayID(ctx context.Context,
	displayID string) (uuid.UUID, error) {
	return s.eventLinks.ResolveDisplayID(ctx, displayID)
}
