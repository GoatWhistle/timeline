package event

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/query"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type QueryService struct {
	queries       *query.Timeline
	events        *event.Events
	stages        *event.Stages
	participants  *participation.Participants
	registrations *participation.Registrations
	statuses      *participation.Statuses
	now           func() time.Time
}

func NewQueryService(queries *query.Timeline, events *event.Events,
	stages *event.Stages, participants *participation.Participants,
	registrations *participation.Registrations, statuses *participation.Statuses) *QueryService {
	return &QueryService{
		queries: queries, events: events, stages: stages, participants: participants,
		registrations: registrations, statuses: statuses,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *QueryService) ResolveDisplayID(ctx context.Context, displayID string) (uuid.UUID, error) {
	return s.events.ResolveDisplayID(ctx, displayID)
}

func (s *QueryService) MyEvents(ctx context.Context, actor models.Actor, filter models.MyEventFilter,
	page models.Page) ([]dto.MyEventItem, int64, error) {
	if actor.IsSystem() {
		return nil, 0, models.NewUnauthorized("authentication is required")
	}
	return s.queries.MyEvents(ctx, actor.UserID, filter, page, s.now())
}

func (s *QueryService) EventCard(ctx context.Context, actor models.Actor,
	eventID uuid.UUID) (*dto.EventCard, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	now := s.now()

	event, err := s.events.GetByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if !event.Published() {
		return nil, models.NewNotFound("event not found")
	}

	participant, err := s.participants.GetByEventUser(ctx, eventID, actor.UserID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.NewNotFound("you are not assigned to this event")
		}
		return nil, err
	}
	if !participant.Assigned() {
		return nil, models.NewNotFound("you are not assigned to this event")
	}

	stages, err := s.stages.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	nextStage, err := s.queries.NextStage(ctx, eventID, now)
	if err != nil {
		return nil, err
	}

	card := &dto.EventCard{
		Event:     eventView(event, stages, now),
		TeamRole:  participant.TeamRole,
		Stages:    make([]dto.StageResponse, 0, len(stages)),
		NextStage: nextStage,
	}
	for i := range stages {
		card.Stages = append(card.Stages, stageView(&stages[i], event))
	}

	if err := s.attachRegistration(ctx, card, event, participant); err != nil {
		return nil, err
	}
	return card, nil
}

func (s *QueryService) attachRegistration(ctx context.Context, card *dto.EventCard,
	event *models.Event, participant *models.EventParticipant,
) error {
	registration, err := s.registrations.GetByEvent(ctx, event.ID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil
		}
		return err
	}
	card.Registration = &dto.RegistrationPublic{
		URL:         registration.URL,
		DeadlineAt:  registration.DeadlineAt,
		Description: registration.Description,
		State:       registration.State,
	}

	status, err := s.statuses.GetByParticipant(ctx, registration.ID, participant.ID)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil
		}
		return err
	}
	card.RegistrationStatus = &dto.RegistrationStatusShort{
		ID:           status.DisplayID,
		Status:       status.Status,
		TodoCycle:    status.TodoCycle,
		RegisteredAt: status.RegisteredAt,
		Note:         status.Note,
	}
	card.CanMarkDone = !event.Archived() && registration.Active() && status.Status == models.StatusTODO
	return nil
}

func (s *QueryService) MySchedule(ctx context.Context, actor models.Actor,
	filter models.ScheduleFilter) (*dto.ScheduleResponse, error) {
	if actor.IsSystem() {
		return nil, models.NewUnauthorized("authentication is required")
	}
	userID := actor.UserID
	rows, err := s.queries.ScheduleRows(ctx, filter, &userID, s.now())
	if err != nil {
		return nil, err
	}
	return &dto.ScheduleResponse{
		Range: dto.TimeRange{From: filter.From, To: filter.To},
		Rows:  rows,
	}, nil
}

func (s *QueryService) Upcoming(ctx context.Context, actor models.Actor, within time.Duration,
	page models.Page) ([]dto.DeadlineItem, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the operation is restricted to administrators")
	}
	return s.queries.Deadlines(ctx, false, within, page, s.now())
}

func (s *QueryService) Overdue(ctx context.Context, actor models.Actor,
	page models.Page) ([]dto.DeadlineItem, int64, error) {
	if !actor.IsAdmin {
		return nil, 0, models.NewForbidden("the operation is restricted to administrators")
	}
	return s.queries.Deadlines(ctx, true, 0, page, s.now())
}

func (s *QueryService) RegistrationCoverage(ctx context.Context,
	actor models.Actor) (*dto.RegistrationCoverage, error) {
	if !actor.IsAdmin {
		return nil, models.NewForbidden("the operation is restricted to administrators")
	}
	coverage, err := s.queries.RegistrationCoverage(ctx)
	if err != nil {
		return nil, err
	}
	return &coverage, nil
}

func eventView(h *models.Event, stages []models.Stage, now time.Time) dto.EventResponse {
	return dto.EventResponse{
		ID:              h.DisplayID,
		Title:           h.Title,
		Description:     h.Description,
		Organizer:       h.Organizer,
		WebsiteURL:      h.WebsiteURL,
		Kind:            h.Kind,
		Format:          h.Format,
		Origin:          h.Origin,
		CountryCode:     h.CountryCode,
		City:            h.City,
		EffectiveFormat: models.DeriveEventFormat(h, stages),
		Track:           h.Track,
		PrizePool:       h.PrizePool,
		PrizeCurrency:   h.PrizeCurrency,
		TeamSizeMin:     h.TeamSizeMin,
		TeamSizeMax:     h.TeamSizeMax,
		CoverURL:        h.EffectiveCoverURL(),
		CoverSource:     h.EffectiveCoverSource(),
		Color:           h.Color(),
		StartAt:         h.StartAt,
		EndAt:           h.EndAt,
		State:           h.State(now),
		PublishedAt:     h.PublishedAt,
		ArchivedAt:      h.ArchivedAt,
		CreatedAt:       h.CreatedAt,
		UpdatedAt:       h.UpdatedAt,
	}
}

func stageView(s *models.Stage, event *models.Event) dto.StageResponse {
	return dto.StageResponse{
		ID:          s.DisplayID,
		EventID:     event.DisplayID,
		Name:        s.Name,
		Type:        s.Type,
		StartAt:     s.StartAt,
		EndAt:       s.EndAt,
		Description: s.Description,
		URL:         s.URL,
		Format:      s.Format,
		CountryCode: s.CountryCode,
		City:        s.City,
		Venue:       s.Venue,
		OnlineURL:   s.OnlineURL,
		Place:       s.ResolvePlace(event),
		SortOrder:   s.SortOrder,
		CreatedAt:   s.CreatedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}
