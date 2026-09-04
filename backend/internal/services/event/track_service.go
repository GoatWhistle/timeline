package event

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/shared/validation"
)

type TrackService struct {
	db           *postgres.DB
	tracks       *event.Tracks
	events       *event.Events
	participants *participation.Participants
	audit        *audit.AuditService
}

func NewTrackService(db *postgres.DB, tracks *event.Tracks, events *event.Events,
	participants *participation.Participants, audit *audit.AuditService) *TrackService {
	return &TrackService{db: db, tracks: tracks, events: events,
		participants: participants, audit: audit}
}

func (s *TrackService) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.tracks.ResolveDisplayID(ctx, displayID)
}

func (s *TrackService) List(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*dto.EventTrackListResponse, error) {
	target, err := s.readable(ctx, actor, eventID)
	if err != nil {
		return nil, err
	}
	items, err := s.tracks.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	return trackListResponse(target, items), nil
}

func (s *TrackService) readable(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*models.Event, error) {
	target, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if actor.IsAdmin {
		return target, nil
	}
	if !target.Published() {
		return nil, models.NewNotFound("event not found")
	}
	return target, nil
}

func (s *TrackService) writable(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*models.Event, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	target, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if target.Kind != models.EventKindHackathon {
		return nil, models.NewConflict("tracks_not_supported",
			"only a hackathon can carry tracks")
	}
	if target.Archived() {
		return nil, models.NewStateTransition("an archived event cannot be changed")
	}
	return target, nil
}

type trackDraft struct {
	name        string
	description *string
	prizes      []models.TrackPrize
	total       int64
}

func validateTrackDraft(req dto.CreateEventTrackRequest) (trackDraft, error) {
	name, err := validation.ValidateText("name", req.Name, 1, 120)
	if err != nil {
		return trackDraft{}, err
	}
	description, err := validation.OptionalText("description", req.Description, 4000)
	if err != nil {
		return trackDraft{}, err
	}
	if err := validateTrackNo(req.TrackNo); err != nil {
		return trackDraft{}, err
	}
	prizes, total, err := validatePrizeInputs(req.Prizes)
	if err != nil {
		return trackDraft{}, err
	}
	return trackDraft{name: name, description: description, prizes: prizes, total: total}, nil
}

func (s *TrackService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req dto.CreateEventTrackRequest) (*dto.EventTrackResponse, error) {
	draft, err := validateTrackDraft(req)
	if err != nil {
		return nil, err
	}

	var (
		created *models.EventTrack
		target  *models.Event
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		target, err = s.writable(ctx, actor, eventID)
		if err != nil {
			return err
		}
		others, err := s.tracks.DistributedTotal(ctx, eventID, nil)
		if err != nil {
			return err
		}
		if err := checkPoolCoverage(target.PrizePool, others, draft.total); err != nil {
			return err
		}
		trackNo := req.TrackNo
		if trackNo == nil {
			next, err := s.tracks.NextTrackNo(ctx, eventID)
			if err != nil {
				return err
			}
			trackNo = &next
		}
		created, err = s.tracks.Create(ctx, &models.EventTrack{
			EventID: eventID, TrackNo: *trackNo, Name: draft.name, Description: draft.description,
		})
		if err != nil {
			return err
		}
		created.Prizes, err = s.tracks.ReplacePrizes(ctx, created.ID, eventID, draft.prizes)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTrackCreate, models.EntityEventTrack,
			created.ID, nil, map[string]any{
				"event_id": eventID, "track_no": created.TrackNo,
				"name": created.Name, "prize_total": sumPrizes(created.Prizes),
			})
	})
	if err != nil {
		return nil, err
	}
	out := TrackResponse(target, created)
	return &out, nil
}

func (s *TrackService) Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.tracks.GetByID(ctx, id)
		if err != nil {
			return err
		}
		if _, err := s.writable(ctx, actor, before.EventID); err != nil {
			return err
		}
		if err := s.tracks.Delete(ctx, id); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditTrackDelete, models.EntityEventTrack, id,
			map[string]any{"event_id": before.EventID, "name": before.Name}, nil)
	})
}

func trackListResponse(target *models.Event, items []models.EventTrack) *dto.EventTrackListResponse {
	out := &dto.EventTrackListResponse{
		Items:         make([]dto.EventTrackResponse, 0, len(items)),
		PrizePool:     wholePool(target.PrizePool),
		PrizeCurrency: target.PrizeCurrency,
	}
	var distributed int64
	for i := range items {
		response := TrackResponse(target, &items[i])
		distributed += mustWhole(response.PrizeTotal)
		out.Items = append(out.Items, response)
	}
	out.Distributed = formatWhole(distributed)
	if out.PrizePool != nil {
		out.Unallocated = pointerWhole(mustWhole(*out.PrizePool) - distributed)
	}
	return out
}
