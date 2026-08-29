package controllers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"time"

	"github.com/coder/websocket"

	"github.com/GoatWhistle/timeline/internal/models"
)

const realtimeWriteTimeout = 10 * time.Second

func (c *RealtimeController) pump(ctx context.Context, conn *websocket.Conn,
	sub models.RealtimeSubscription, actor models.Actor) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	go drainClient(ctx, conn, cancel)

	if !c.write(ctx, conn, models.RealtimeEnvelope{
		Type: models.RealtimeEnvelopeHello, ServerTime: c.now()}) {
		return
	}

	ticker := time.NewTicker(c.ping)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-sub.Done():
			_ = conn.Close(websocket.StatusPolicyViolation, "session is no longer live")
			return
		case env := <-sub.Messages():
			if !c.write(ctx, conn, env) {
				return
			}
		case <-ticker.C:
			if err := c.sessions.EnsureLive(ctx, actor.UserID, actor.SessionID); err != nil {
				slog.InfoContext(ctx, "realtime connection closed, session is no longer live",
					"user_id", actor.UserID, "session_id", actor.SessionID)
				_ = conn.Close(websocket.StatusPolicyViolation, "session is no longer live")
				return
			}
			pingCtx, pingCancel := context.WithTimeout(ctx, realtimeWriteTimeout)
			err := conn.Ping(pingCtx)
			pingCancel()
			if err != nil {
				return
			}
		}
	}
}

func (c *RealtimeController) write(ctx context.Context, conn *websocket.Conn,
	env models.RealtimeEnvelope) bool {
	body, err := json.Marshal(env)
	if err != nil {
		slog.ErrorContext(ctx, "failed to encode a realtime envelope", "error", err)
		return true
	}
	writeCtx, cancel := context.WithTimeout(ctx, realtimeWriteTimeout)
	defer cancel()
	if err := conn.Write(writeCtx, websocket.MessageText, body); err != nil {
		if !errors.Is(err, context.Canceled) {
			slog.DebugContext(ctx, "realtime write failed, connection closed", "error", err)
		}
		return false
	}
	return true
}

func drainClient(ctx context.Context, conn *websocket.Conn, cancel context.CancelFunc) {
	defer cancel()
	for {
		if _, _, err := conn.Read(ctx); err != nil {
			return
		}
	}
}
