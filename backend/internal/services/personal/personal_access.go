package personal

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/event"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/participation"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/personal"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

type PersonalService struct {
	db           *postgres.DB
	tasks        *personal.Tasks
	notes        *personal.Notes
	artifacts    *personal.Artifacts
	outcomes     *personal.Outcomes
	bookmarks    *personal.Bookmarks
	templates    *personal.Templates
	history      *personal.History
	retros       *personal.Retrospectives
	events       *event.Events
	stages       *event.Stages
	participants *participation.Participants
	limits       config.Personal
	now          func() time.Time
}

func NewPersonalService(db *postgres.DB, tasks *personal.Tasks, notes *personal.Notes,
	artifacts *personal.Artifacts, outcomes *personal.Outcomes, bookmarks *personal.Bookmarks,
	templates *personal.Templates, history *personal.History, events *event.Events,
	stages *event.Stages, participants *participation.Participants,
	limits config.Personal) *PersonalService {
	return &PersonalService{
		db: db, tasks: tasks, notes: notes, artifacts: artifacts, outcomes: outcomes,
		bookmarks: bookmarks, templates: templates, history: history, events: events,
		stages: stages, participants: participants, limits: limits,
		now: func() time.Time { return time.Now().UTC() },
	}
}

func (s *PersonalService) WithRetrospectives(retros *personal.Retrospectives) {
	s.retros = retros
}

func (s *PersonalService) owner(actor models.Actor) (uuid.UUID, error) {
	if actor.UserID == uuid.Nil {
		return uuid.Nil, models.NewForbidden("the personal layer requires an authenticated user")
	}
	return actor.UserID, nil
}

func (s *PersonalService) visibleEvent(ctx context.Context, userID,
	eventID uuid.UUID) (*models.Event, error) {
	ev, err := s.events.GetByID(ctx, eventID)
	if errors.Is(err, models.ErrNotFound) {
		return nil, models.NewNotFound("event not found")
	}
	if err != nil {
		return nil, err
	}
	if ev.Schedulable() {
		return ev, nil
	}

	participant, err := s.participants.GetByEventUser(ctx, eventID, userID)
	if errors.Is(err, models.ErrNotFound) {
		return nil, models.NewNotFound("event not found")
	}
	if err != nil {
		return nil, err
	}
	if !participant.Assigned() {
		return nil, models.NewNotFound("event not found")
	}
	return ev, nil
}

func (s *PersonalService) checkStage(ctx context.Context, eventID uuid.UUID,
	stageID *uuid.UUID) error {
	if stageID == nil {
		return nil
	}
	stage, err := s.stages.GetByID(ctx, *stageID)
	if errors.Is(err, models.ErrNotFound) {
		return models.NewNotFound("stage not found")
	}
	if err != nil {
		return err
	}
	if stage.EventID != eventID {
		return models.NewValidation("the stage belongs to another event",
			models.FieldError{Field: "stage_id", Message: "the stage must belong to the same event"})
	}
	return nil
}
