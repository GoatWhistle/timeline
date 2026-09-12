package realtime

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/models"
)

type SystemEventService struct {
	db     *postgres.DB
	events *systemevent.Events
	now    func() time.Time
}

func NewSystemEventService(db *postgres.DB, events *systemevent.Events) *SystemEventService {
	return &SystemEventService{db: db, events: events, now: func() time.Time { return time.Now().UTC() }}
}

type EmitRequest struct {
	Type        models.SystemEventType
	Severity    models.EventSeverity
	Audience    models.AudienceKind
	UserID      *uuid.UUID
	SubjectType string
	SubjectID   *uuid.UUID
	Payload     map[string]any
	DedupKey    string
}

func (s *SystemEventService) Emit(ctx context.Context, req EmitRequest) (*models.SystemEvent, error) {
	event := &models.SystemEvent{
		Type:      req.Type,
		Severity:  req.Severity,
		Audience:  req.Audience,
		UserID:    req.UserID,
		SubjectID: req.SubjectID,
		Payload:   req.Payload,
	}
	if req.SubjectType != "" && req.SubjectID != nil {
		subject := req.SubjectType
		event.SubjectType = &subject
	} else {
		event.SubjectID = nil
	}
	if req.DedupKey != "" {
		key := req.DedupKey
		event.DedupKey = &key
	}

	stored, inserted, err := s.events.Insert(ctx, event)
	if err != nil {
		return nil, err
	}
	if !inserted {
		return nil, nil
	}
	signal := systemevent.Signal{EventID: &stored.ID}
	if stored.Audience == models.AudienceUser {
		signal.UserID = stored.UserID
	} else {
		signal.Admin = true
	}
	if err := s.events.Publish(ctx, signal); err != nil {
		return stored, err
	}
	return stored, nil
}

func (s *SystemEventService) EmitOnTransition(ctx context.Context, subjectKey, state string,
	req EmitRequest) (*models.SystemEvent, error) {
	changed, changedAt, err := s.events.StoreObservedState(ctx, subjectKey, state)
	if err != nil {
		return nil, err
	}
	if !changed {
		return nil, nil
	}
	req.DedupKey = subjectKey + ":" + state + ":" + changedAt.UTC().Format(time.RFC3339Nano)
	return s.Emit(ctx, req)
}

func (s *SystemEventService) Cleanup(ctx context.Context, retention time.Duration) (int64, error) {
	return s.events.DeleteOlderThan(ctx, s.now().Add(-retention))
}

func (s *SystemEventService) NotifyInbox(ctx context.Context, userID uuid.UUID) error {
	return s.events.Publish(ctx, systemevent.Signal{UserID: &userID, Keys: []string{"inbox"}})
}
