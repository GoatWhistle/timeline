package team

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *TeamService) EnterEvent(ctx context.Context, actor models.Actor, teamID, eventID uuid.UUID,
	req dto.EnterEventRequest) (*dto.TeamEventEntryResponse, error) {
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

		trackID, err := s.resolveTrack(ctx, eventRow, req.TrackID)
		if err != nil {
			return err
		}
		created, err = s.entries.Create(ctx, teamID, eventID, trackID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamEventEnter, models.EntityTeamEventEntry,
			created.ID, nil, map[string]any{"team_id": teamID, "event_id": eventID,
				"track_id": trackID})
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
	teamRow, err := s.visible(ctx, actor, teamID)
	if err != nil {
		return nil, err
	}
	entries, err := s.entries.ListForTeam(ctx, teamID)
	if err != nil {
		return nil, err
	}

	entryIDs := make([]uuid.UUID, 0, len(entries))
	eventIDs := make([]uuid.UUID, 0, len(entries))
	for i := range entries {
		entryIDs = append(entryIDs, entries[i].ID)
		eventIDs = append(eventIDs, entries[i].EventID)
	}

	labels, err := s.events.LabelsByIDs(ctx, eventIDs)
	if err != nil {
		return nil, err
	}
	standings, err := s.entries.StandingByEntry(ctx, entryIDs)
	if err != nil {
		return nil, err
	}
	rosters, err := s.rosters.ListByEntries(ctx, entryIDs)
	if err != nil {
		return nil, err
	}

	byEvent, err := s.tracks.ListByEvents(ctx, eventIDs)
	if err != nil {
		return nil, err
	}

	items := make([]dto.TeamEventEntryResponse, 0, len(entries))
	for i := range entries {
		label, ok := labels[entries[i].EventID]
		if !ok {
			return nil, models.NewNotFound("event not found")
		}
		tracks := listTracks(byEvent[entries[i].EventID], entries[i].TrackID)
		tracks.locked = !label.StartAt.After(s.now())
		items = append(items, buildEntryResponse(&entries[i], teamRow.DisplayID,
			label, standings[entries[i].ID], rosters[entries[i].ID], tracks))
	}
	return &dto.TeamEventEntryListResponse{Items: items}, nil
}

func listTracks(tracks []models.EventTrack, chosen *uuid.UUID) entryTracks {
	out := entryTracks{available: make([]dto.EventTrackSummary, 0, len(tracks))}
	for i := range tracks {
		summary := dto.EventTrackSummary{
			ID:         tracks[i].DisplayID,
			TrackNo:    tracks[i].TrackNo,
			Name:       tracks[i].Name,
			PrizeTotal: tracks[i].PrizeTotal(),
		}
		out.available = append(out.available, summary)
		if chosen != nil && tracks[i].ID == *chosen {
			match := summary
			out.chosen = &match
		}
	}
	return out
}

type entryTracks struct {
	chosen    *dto.EventTrackSummary
	available []dto.EventTrackSummary
	locked    bool
}

func buildEntryResponse(entry *models.TeamEventEntry, teamDisplayID string,
	label event.EventLabel, standing models.TeamEventStanding,
	roster []dto.TeamRosterMemberResponse, tracks entryTracks) dto.TeamEventEntryResponse {
	if roster == nil {
		roster = []dto.TeamRosterMemberResponse{}
	}
	if tracks.available == nil {
		tracks.available = []dto.EventTrackSummary{}
	}
	return dto.TeamEventEntryResponse{
		ID:              entry.DisplayID,
		TeamID:          teamDisplayID,
		EventID:         label.DisplayID,
		EventTitle:      label.Title,
		Track:           tracks.chosen,
		Tracks:          tracks.available,
		TrackLocked:     tracks.locked,
		EnteredAt:       entry.EnteredAt,
		RosterSize:      standing.RosterSize,
		AssignedMembers: standing.AssignedMembers,
		RegisteredCount: standing.RegisteredCount,
		TeamSizeMin:     standing.TeamSizeMin,
		TeamSizeMax:     standing.TeamSizeMax,
		Registered:      standing.Registered(),
		Roster:          roster,
	}
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
	tracks, err := s.trackContext(ctx, eventRow, entry.TrackID)
	if err != nil {
		return nil, err
	}
	tracks.locked = s.trackChangeAllowed(eventRow) != nil
	response := buildEntryResponse(entry, teamRow.DisplayID,
		event.EventLabel{DisplayID: eventRow.DisplayID, Title: eventRow.Title,
			StartAt: eventRow.StartAt}, standing, roster,
		tracks)
	return &response, nil
}
