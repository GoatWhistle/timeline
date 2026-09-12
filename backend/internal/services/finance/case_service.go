package finance

import (
	"context"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	pgfinance "github.com/GoatWhistle/timeline/internal/adapters/postgres/finance"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
	"github.com/GoatWhistle/timeline/internal/services/shared/audit"
)

type CaseService struct {
	db     *postgres.DB
	cases  *pgfinance.Cases
	tracks *event.Tracks
	events *event.Events
	audit  *audit.AuditService
}

func NewCaseService(db *postgres.DB, cases *pgfinance.Cases, tracks *event.Tracks,
	events *event.Events, auditService *audit.AuditService) *CaseService {
	return &CaseService{db: db, cases: cases, tracks: tracks, events: events, audit: auditService}
}

func (s *CaseService) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.cases.ResolveDisplayID(ctx, displayID)
}

func (s *CaseService) List(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*dto.EventCaseListResponse, error) {
	target, err := s.readable(ctx, actor, eventID)
	if err != nil {
		return nil, err
	}
	items, err := s.cases.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	tracks, err := s.tracks.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	return &dto.EventCaseListResponse{Items: CaseResponses(target, items, tracks)}, nil
}

func (s *CaseService) Create(ctx context.Context, actor models.Actor, eventID uuid.UUID,
	req dto.CreateEventCaseRequest) (*dto.EventCaseResponse, error) {
	draft, err := validateCaseDraft(req)
	if err != nil {
		return nil, err
	}

	var (
		created *models.EventCase
		target  *models.Event
		tracks  []models.EventTrack
	)
	err = s.db.WithTx(ctx, func(ctx context.Context) error {
		target, err = s.writable(ctx, actor, eventID)
		if err != nil {
			return err
		}
		trackID, err := s.resolveTrack(ctx, eventID, req.TrackID)
		if err != nil {
			return err
		}
		caseNo := req.CaseNo
		if caseNo == nil {
			next, err := s.cases.NextCaseNo(ctx, eventID)
			if err != nil {
				return err
			}
			caseNo = &next
		}
		created, err = s.cases.Create(ctx, &models.EventCase{
			EventID: eventID, TrackID: trackID, CaseNo: *caseNo, Name: draft.name,
			Description: draft.description, Partner: draft.partner, PrizeAmount: draft.prize,
		})
		if err != nil {
			return err
		}
		tracks, err = s.tracks.ListByEvent(ctx, eventID)
		if err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditCaseCreate, models.EntityEventCase,
			created.ID, nil, map[string]any{
				"event_id": eventID, "case_no": created.CaseNo, "name": created.Name,
			})
	})
	if err != nil {
		return nil, err
	}
	out := CaseResponse(target, created, tracks)
	return &out, nil
}

func (s *CaseService) Delete(ctx context.Context, actor models.Actor, id uuid.UUID) error {
	return s.db.WithTx(ctx, func(ctx context.Context) error {
		before, err := s.cases.GetByID(ctx, id)
		if err != nil {
			return err
		}
		if _, err := s.writable(ctx, actor, before.EventID); err != nil {
			return err
		}
		if err := s.cases.Delete(ctx, id); err != nil {
			return err
		}
		return s.audit.Record(ctx, actor, models.AuditCaseDelete, models.EntityEventCase, id,
			map[string]any{"event_id": before.EventID, "name": before.Name}, nil)
	})
}

func (s *CaseService) resolveTrack(ctx context.Context, eventID uuid.UUID,
	raw *string) (*uuid.UUID, error) {
	if raw == nil {
		return nil, nil
	}
	parsed, err := dto.ParseDisplayID(dto.DisplayKindEventTrack, *raw)
	if err != nil {
		return nil, err
	}
	trackID, err := s.tracks.ResolveDisplayID(ctx, parsed.String())
	if err != nil {
		return nil, err
	}
	track, err := s.tracks.GetByID(ctx, trackID)
	if err != nil {
		return nil, err
	}
	if track.EventID != eventID {
		return nil, models.NewNotFound("event track not found")
	}
	return &trackID, nil
}
