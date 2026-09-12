package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
)

type Client interface {
	Sender
	WebhookRegistrar
	CallbackAnswerer
	telegramlink.Source
	Check(context.Context) error
}

var allowedUpdateTypes = []string{"message", "callback_query"}

func (s *botSender) Check(ctx context.Context) error {
	return s.call(ctx, "getMe", struct{}{}, nil, s.cfg.Timeout)
}

func (s *botSender) DeleteWebhook(ctx context.Context) error {
	return s.call(ctx, "deleteWebhook", map[string]any{"drop_pending_updates": false}, nil, s.cfg.Timeout)
}

func (s *botSender) Updates(ctx context.Context, offset int64) ([]telegramlink.Update, error) {
	var updates []telegramlink.Update
	err := s.call(ctx, "getUpdates", map[string]any{
		"offset": offset, "timeout": 25, "allowed_updates": allowedUpdateTypes,
	}, &updates, 25*time.Second+s.cfg.Timeout)
	return updates, err
}

func (s *botSender) call(ctx context.Context, method string, body, result any, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	encoded, err := json.Marshal(body)
	if err != nil {
		return err
	}
	endpoint := strings.TrimRight(s.cfg.APIBase, "/") + "/bot" + s.cfg.BotToken + "/" + method
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(encoded))
	if err != nil {
		return s.redactError(err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.client.Do(req)
	if err != nil {
		return s.redactError(err)
	}
	defer resp.Body.Close()
	var parsed struct {
		apiResponse
		Result json.RawMessage `json:"result"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 4<<20)).Decode(&parsed); err != nil {
		return fmt.Errorf("telegram %s: HTTP %d, invalid response", method, resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK || !parsed.OK {
		return s.redactError(fmt.Errorf("telegram %s: HTTP %d: %s", method, resp.StatusCode, parsed.Description))
	}
	if result != nil {
		return json.Unmarshal(parsed.Result, result)
	}
	return nil
}
