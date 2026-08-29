package systemevent

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const Channel = "timeline_realtime"

type Signal struct {
	EventID *uuid.UUID `json:"event_id,omitempty"`
	UserID  *uuid.UUID `json:"user_id,omitempty"`
	Admin   bool       `json:"admin,omitempty"`
	Keys    []string   `json:"keys,omitempty"`
}

func (r *Events) Publish(ctx context.Context, signal Signal) error {
	body, err := json.Marshal(signal)
	if err != nil {
		return err
	}
	_, err = r.db.Q(ctx).Exec(ctx, `SELECT pg_notify($1, $2)`, Channel, string(body))
	return mapError(err)
}

func (r *Events) Listen(ctx context.Context, deliver func(Signal)) error {
	conn, err := r.db.Pool().Acquire(ctx)
	if err != nil {
		return fmt.Errorf("acquiring a listener connection: %w", err)
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "LISTEN "+pgx.Identifier{Channel}.Sanitize()); err != nil {
		return fmt.Errorf("subscribing to the realtime channel: %w", err)
	}

	for {
		msg, err := conn.Conn().WaitForNotification(ctx)
		if err != nil {
			return err
		}
		var signal Signal
		if err := json.Unmarshal([]byte(msg.Payload), &signal); err != nil {
			continue
		}
		deliver(signal)
	}
}
