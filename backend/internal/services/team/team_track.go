package team

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *TeamService) resolveTrack(ctx context.Context, eventRow *models.Event,
	displayID *string) (*uuid.UUID, error) {
	if displayID == nil || *displayID == "" {
		return nil, nil
	}
	parsed, err := dto.ParseDisplayID(dto.DisplayKindEventTrack, *displayID)
	if err != nil {
		return nil, models.NewValidation("invalid track identifier",
			models.FieldError{Field: "track_id", Message: "an event track identifier is expected"})
	}
	trackID, err := s.tracks.ResolveDisplayID(ctx, parsed.Value)
	if err != nil {
		return nil, err
	}
	track, err := s.tracks.GetByID(ctx, trackID)
	if err != nil {
		return nil, err
	}
	if track.EventID != eventRow.ID {
		return nil, models.NewValidation("the track belongs to another event",
			models.FieldError{Field: "track_id", Message: "choose a track of this event"})
	}
	return &trackID, nil
}

func (s *TeamService) trackChangeAllowed(eventRow *models.Event) error {
	if !eventRow.StartAt.After(s.now()) {
		return models.NewStateTransition("the track cannot be changed once the event has started")
	}
	return nil
}

func (s *TeamService) ChooseTrack(ctx context.Context, actor models.Actor,
	teamID, eventID uuid.UUID, req dto.ChooseTrackRequest) (*dto.TeamEventEntryResponse, error) {
	var (
		entry    *models.TeamEventEntry
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
		before, err := s.entries.GetByTeamEvent(ctx, teamID, eventID)
		if err != nil {
			return err
		}
		if err := s.trackChangeAllowed(eventRow); err != nil {
			return err
		}
		trackID, err := s.resolveTrack(ctx, eventRow, req.TrackID)
		if err != nil {
			return err
		}
		entry, err = s.entries.SetTrack(ctx, before.ID, trackID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamTrackChoose,
			models.EntityTeamEventEntry, before.ID,
			map[string]any{"track_id": before.TrackID},
			map[string]any{"track_id": trackID})
	})
	if err != nil {
		return nil, err
	}
	return s.entryResponse(ctx, entry, eventRow)
}

func (s *TeamService) trackContext(ctx context.Context, eventRow *models.Event,
	chosen *uuid.UUID) (entryTracks, error) {
	tracks, err := s.tracks.ListByEvent(ctx, eventRow.ID)
	if err != nil {
		return entryTracks{}, err
	}
	return listTracks(tracks, chosen), nil
}
