package services

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/models"
)

func (h *RealtimeHub) dispatch(signal systemevent.Signal) {
	if len(signal.Keys) > 0 {
		h.dispatchInvalidation(signal)
	}
	if signal.EventID != nil {
		h.dispatchEvent(*signal.EventID)
	}
}

func (h *RealtimeHub) dispatchInvalidation(signal systemevent.Signal) {
	env := models.RealtimeEnvelope{Type: models.RealtimeEnvelopeInvalidate, Keys: signal.Keys}
	h.Broadcast(env, audienceMatch(signal.UserID, signal.Admin))
}

func (h *RealtimeHub) dispatchEvent(id uuid.UUID) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	stored, err := h.events.GetByID(ctx, id)
	if err != nil {
		slog.ErrorContext(ctx, "failed to read the signalled system event", "error", err, "event_id", id)
		return
	}
	body := SystemEventResponse(stored, false)
	env := models.RealtimeEnvelope{Type: models.RealtimeEnvelopeEvent, Event: &body}

	if stored.Audience == models.AudienceUser && stored.UserID != nil {
		h.Broadcast(env, audienceMatch(stored.UserID, false))
		return
	}
	h.Broadcast(env, audienceMatch(nil, true))
}

func audienceMatch(userID *uuid.UUID, admin bool) func(*Subscriber) bool {
	return func(s *Subscriber) bool {
		if userID != nil && s.UserID == *userID {
			return true
		}
		return admin && s.IsAdmin
	}
}

func SystemEventResponse(e *models.SystemEvent, read bool) models.SystemEventResponse {
	return models.SystemEventResponse{
		ID:          e.ID,
		Type:        string(e.Type),
		Severity:    string(e.Severity),
		SubjectType: e.SubjectType,
		SubjectID:   e.SubjectID,
		Payload:     e.Payload,
		Read:        read,
		CreatedAt:   e.CreatedAt,
	}
}
