package realtime

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/systemevent"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/models/dto"
)

type Subscriber struct {
	UserID    uuid.UUID
	SessionID uuid.UUID
	IsAdmin   bool
	Out       chan dto.RealtimeEnvelope
	closeOnce sync.Once
	done      chan struct{}
}

func (s *Subscriber) Done() <-chan struct{} { return s.done }

func (s *Subscriber) Messages() <-chan dto.RealtimeEnvelope { return s.Out }

func (s *Subscriber) Close() {
	s.closeOnce.Do(func() { close(s.done) })
}

type RealtimeHub struct {
	events *systemevent.Events

	mu          sync.RWMutex
	subscribers map[*Subscriber]struct{}
	perSession  map[uuid.UUID]int
	perUser     map[uuid.UUID]int
	maxPerUser  int
}

func NewRealtimeHub(events *systemevent.Events, maxPerUser int) *RealtimeHub {
	if maxPerUser <= 0 {
		maxPerUser = 8
	}
	return &RealtimeHub{
		events:      events,
		subscribers: make(map[*Subscriber]struct{}),
		perSession:  make(map[uuid.UUID]int),
		perUser:     make(map[uuid.UUID]int),
		maxPerUser:  maxPerUser,
	}
}

func (h *RealtimeHub) Subscribe(userID, sessionID uuid.UUID,
	isAdmin bool) (dto.RealtimeSubscription, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.perUser[userID] >= h.maxPerUser {
		return nil, models.NewRateLimited("too many realtime connections for this account")
	}
	sub := &Subscriber{
		UserID:    userID,
		SessionID: sessionID,
		IsAdmin:   isAdmin,
		Out:       make(chan dto.RealtimeEnvelope, 32),
		done:      make(chan struct{}),
	}
	h.subscribers[sub] = struct{}{}
	h.perSession[sessionID]++
	h.perUser[userID]++
	return sub, nil
}

func (h *RealtimeHub) Unsubscribe(subscription dto.RealtimeSubscription) {
	sub, ok := subscription.(*Subscriber)
	if !ok {
		return
	}
	h.mu.Lock()
	if _, ok := h.subscribers[sub]; ok {
		delete(h.subscribers, sub)
		h.perSession[sub.SessionID]--
		if h.perSession[sub.SessionID] <= 0 {
			delete(h.perSession, sub.SessionID)
		}
		h.perUser[sub.UserID]--
		if h.perUser[sub.UserID] <= 0 {
			delete(h.perUser, sub.UserID)
		}
	}
	h.mu.Unlock()
	sub.Close()
}

func (h *RealtimeHub) DropSession(sessionID uuid.UUID) int {
	return h.drop(func(s *Subscriber) bool { return s.SessionID == sessionID })
}

func (h *RealtimeHub) DropUser(userID uuid.UUID) int {
	return h.drop(func(s *Subscriber) bool { return s.UserID == userID })
}

func (h *RealtimeHub) drop(match func(*Subscriber) bool) int {
	h.mu.RLock()
	victims := make([]*Subscriber, 0, 4)
	for sub := range h.subscribers {
		if match(sub) {
			victims = append(victims, sub)
		}
	}
	h.mu.RUnlock()
	for _, sub := range victims {
		sub.Close()
	}
	return len(victims)
}

func (h *RealtimeHub) Broadcast(env dto.RealtimeEnvelope, match func(*Subscriber) bool) {
	h.mu.RLock()
	targets := make([]*Subscriber, 0, len(h.subscribers))
	for sub := range h.subscribers {
		if match(sub) {
			targets = append(targets, sub)
		}
	}
	h.mu.RUnlock()

	for _, sub := range targets {
		select {
		case sub.Out <- env:
		default:
			slog.Warn("realtime subscriber is too slow, connection dropped",
				"user_id", sub.UserID, "session_id", sub.SessionID)
			sub.Close()
		}
	}
}

func (h *RealtimeHub) Start(ctx context.Context) {
	for {
		if err := h.events.Listen(ctx, h.dispatch); err != nil {
			if ctx.Err() != nil {
				return
			}
			slog.ErrorContext(ctx, "realtime listener failed, reconnecting", "error", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(time.Second):
		}
	}
}
