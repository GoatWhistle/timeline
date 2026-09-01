package team

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

func (s *TeamService) AddToRoster(ctx context.Context, actor models.Actor,
	teamID, eventID, userID uuid.UUID) (*dto.TeamEventEntryResponse, error) {
	var (
		entry    *models.TeamEventEntry
		eventRow *models.Event
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		member, resolved, err := s.leadRosterTarget(ctx, actor, teamID, eventID, userID)
		if err != nil {
			return err
		}
		entry = resolved

		eventRow, err = s.events.GetByID(ctx, eventID)
		if err != nil {
			return err
		}
		present, err := s.rosters.Contains(ctx, entry.ID, member.ID)
		if err != nil {
			return err
		}
		if present {
			return models.NewConflict("already_on_roster", "the member is already on this event roster")
		}

		size, err := s.rosters.CountForUpdate(ctx, entry.ID)
		if err != nil {
			return err
		}
		if eventRow.TeamSizeMax != nil && size >= *eventRow.TeamSizeMax {
			return models.NewConflict("roster_full",
				"the event roster already holds the maximum team size")
		}

		row, err := s.rosters.Add(ctx, entry.ID, member.ID, teamID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamRosterAdd, models.EntityTeamEventEntry,
			entry.ID, nil, map[string]any{"team_id": teamID, "event_id": eventID,
				"user_id": userID, "roster_entry_id": row.ID})
	})
	if err != nil {
		return nil, err
	}
	return s.entryResponse(ctx, entry, eventRow)
}

func (s *TeamService) RemoveFromRoster(ctx context.Context, actor models.Actor,
	teamID, eventID, userID uuid.UUID) (*dto.TeamEventEntryResponse, error) {
	var (
		entry    *models.TeamEventEntry
		eventRow *models.Event
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		member, resolved, err := s.leadRosterTarget(ctx, actor, teamID, eventID, userID)
		if err != nil {
			return err
		}
		entry = resolved

		eventRow, err = s.events.GetByID(ctx, eventID)
		if err != nil {
			return err
		}
		if err := s.rosters.Remove(ctx, entry.ID, member.ID); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTeamRosterRemove, models.EntityTeamEventEntry,
			entry.ID, map[string]any{"team_id": teamID, "event_id": eventID, "user_id": userID}, nil)
	})
	if err != nil {
		return nil, err
	}
	return s.entryResponse(ctx, entry, eventRow)
}

func (s *TeamService) MarkRosterMemberRegistered(ctx context.Context, actor models.Actor,
	teamID, eventID, userID uuid.UUID) (*dto.TeamEventEntryResponse, error) {
	var (
		entry    *models.TeamEventEntry
		eventRow *models.Event
	)
	err := s.db.WithTx(ctx, func(ctx context.Context) error {
		member, resolved, err := s.leadRosterTarget(ctx, actor, teamID, eventID, userID)
		if err != nil {
			return err
		}
		entry = resolved

		present, err := s.rosters.Contains(ctx, entry.ID, member.ID)
		if err != nil {
			return err
		}
		if !present {
			return models.NewNotFound("the member is not on this event roster")
		}

		eventRow, err = s.events.GetByID(ctx, eventID)
		if err != nil {
			return err
		}
		return s.markOne(ctx, actor, eventRow, userID)
	})
	if err != nil {
		return nil, err
	}
	return s.entryResponse(ctx, entry, eventRow)
}

func (s *TeamService) leadRosterTarget(ctx context.Context, actor models.Actor,
	teamID, eventID, userID uuid.UUID) (*models.TeamMember, *models.TeamEventEntry, error) {
	if _, err := s.leadOnly(ctx, actor, teamID); err != nil {
		return nil, nil, err
	}
	entry, err := s.entries.GetByTeamEvent(ctx, teamID, eventID)
	if err != nil {
		return nil, nil, err
	}
	member, err := s.members.GetByTeamUser(ctx, teamID, userID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, nil, models.NewNotFound("team member not found")
		}
		return nil, nil, err
	}
	if !member.Active() {
		return nil, nil, models.NewNotFound("team member not found")
	}
	return member, entry, nil
}

func (s *TeamService) markOne(ctx context.Context, actor models.Actor, eventRow *models.Event,
	userID uuid.UUID) error {
	if !eventRow.Published() {
		return models.NewNotFound("event not found")
	}
	if eventRow.Archived() {
		return models.NewStateTransition("event is archived")
	}

	participant, err := s.participants.GetByEventUser(ctx, eventRow.ID, userID)
	if err != nil || !participant.Assigned() {
		return models.NewNotFound("the member is not assigned to this event")
	}
	registration, err := s.registrations.GetByEvent(ctx, eventRow.ID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return models.NewNotFound("registration not found")
		}
		return err
	}
	if !registration.Active() {
		return models.NewStateTransition("registration is disabled")
	}

	status, err := s.statuses.GetByParticipant(ctx, registration.ID, participant.ID)
	if err != nil {
		return err
	}
	if status.Status == models.StatusDONE {
		return nil
	}
	if status.Status != models.StatusTODO {
		return models.NewStateTransition("only a TODO status can be moved to DONE")
	}

	updated, err := s.statuses.SetStatus(ctx, status.ID, models.StatusDONE,
		models.SourceUser, actor.UserRef(), nil)
	if err != nil {
		return err
	}
	if err := s.notifier.CancelForStatus(ctx, status.ID); err != nil {
		return err
	}
	return s.audit.Record(ctx, actor, models.AuditStatusChange, models.EntityRegistrationStatus,
		status.ID,
		map[string]any{"status": status.Status, "todo_cycle": status.TodoCycle},
		map[string]any{"status": updated.Status, "registered_at": updated.RegisteredAt,
			"marked_by_team_lead": true, "subject_user_id": userID})
}
