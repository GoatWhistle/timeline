package team

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *TeamService) EnterEvent(ctx context.Context, actor models.Actor, teamID, eventID uuid.UUID,
) (*dto.TeamEventEntryResponse, error) {
	var (
		created  *models.TeamEventEntry
		eventRow *models.Event
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		if _, err := s.leadOnly(ctx, actor, teamID); err != nil {
			return err
		}
		var err error
		eventRow, err = s.events.GetByID(ctx, eventID)
		if err != nil {
			return err
		}
		if !eventRow.Schedulable() {
			return models.NewNotFound("event not found")
		}
		if eventRow.Kind != models.EventKindHackathon {
			return models.NewStateTransition("only a hackathon accepts a team entry")
		}

		if _, err := s.entries.GetByTeamEvent(ctx, teamID, eventID); err == nil {
			return models.NewConflict("already_entered", "the team already entered this event")
		} else if !errors.Is(err, models.ErrNotFound) {
			return err
		}

		created, err = s.entries.Create(ctx, teamID, eventID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamEventEnter, models.EntityTeamEventEntry,
			created.ID, nil, map[string]any{"team_id": teamID, "event_id": eventID})
	})
	if err != nil {
		return nil, err
	}
	return s.entryResponse(ctx, created, eventRow)
}

func (s *TeamService) EventStanding(ctx context.Context, actor models.Actor, teamID, eventID uuid.UUID,
) (*dto.TeamEventEntryResponse, error) {
	if _, err := s.visible(ctx, actor, teamID); err != nil {
		return nil, err
	}
	entry, err := s.entries.GetByTeamEvent(ctx, teamID, eventID)
	if err != nil {
		return nil, err
	}
	eventRow, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	return s.entryResponse(ctx, entry, eventRow)
}

func (s *TeamService) ListEvents(ctx context.Context, actor models.Actor, teamID uuid.UUID,
) (*dto.TeamEventEntryListResponse, error) {
	if _, err := s.visible(ctx, actor, teamID); err != nil {
		return nil, err
	}
	eventIDs, err := s.entries.ListEventIDs(ctx, teamID)
	if err != nil {
		return nil, err
	}

	items := make([]dto.TeamEventEntryResponse, 0, len(eventIDs))
	for _, eventID := range eventIDs {
		entry, err := s.entries.GetByTeamEvent(ctx, teamID, eventID)
		if err != nil {
			return nil, err
		}
		eventRow, err := s.events.GetByID(ctx, eventID)
		if err != nil {
			return nil, err
		}
		item, err := s.entryResponse(ctx, entry, eventRow)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	return &dto.TeamEventEntryListResponse{Items: items}, nil
}

func (s *TeamService) entryResponse(ctx context.Context, entry *models.TeamEventEntry,
	eventRow *models.Event) (*dto.TeamEventEntryResponse, error) {
	standing, err := s.entries.Standing(ctx, entry.ID, entry.EventID)
	if err != nil {
		return nil, err
	}
	teamRow, err := s.teams.GetByID(ctx, entry.TeamID)
	if err != nil {
		return nil, err
	}
	roster, err := s.rosters.List(ctx, entry.ID, entry.EventID)
	if err != nil {
		return nil, err
	}
	return &dto.TeamEventEntryResponse{
		ID:              entry.DisplayID,
		TeamID:          teamRow.DisplayID,
		EventID:         eventRow.DisplayID,
		EventTitle:      eventRow.Title,
		EnteredAt:       entry.EnteredAt,
		RosterSize:      standing.RosterSize,
		AssignedMembers: standing.AssignedMembers,
		RegisteredCount: standing.RegisteredCount,
		TeamSizeMin:     standing.TeamSizeMin,
		TeamSizeMax:     standing.TeamSizeMax,
		Registered:      standing.Registered(),
		Roster:          roster,
	}, nil
}
