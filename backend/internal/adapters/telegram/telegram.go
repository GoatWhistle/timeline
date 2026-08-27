package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

type Sender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
	DeepLink(token string) string
}

func New(cfg config.Telegram) Sender {
	if cfg.Driver == "bot" && cfg.BotToken != "" {
		return &botSender{cfg: cfg, client: &http.Client{Timeout: cfg.Timeout}}
	}
	return &logSender{cfg: cfg}
}

type logSender struct{ cfg config.Telegram }

func (s *logSender) Send(ctx context.Context, msg models.OutboundMessage) error {
	slog.InfoContext(ctx, "telegram message not sent: log driver active",
		"chat_id", msg.Recipient, "idempotency_key", msg.IdempotencyKey)
	return nil
}

func (s *logSender) DeepLink(token string) string { return deepLink(s.cfg.BotName, token) }

type botSender struct {
	cfg    config.Telegram
	client *http.Client
}

type sendMessageRequest struct {
	ChatID string `json:"chat_id"`
	Text   string `json:"text"`
}

type apiResponse struct {
	OK          bool   `json:"ok"`
	ErrorCode   int    `json:"error_code"`
	Description string `json:"description"`
}

func (s *botSender) Send(ctx context.Context, msg models.OutboundMessage) error {
	if strings.TrimSpace(msg.Recipient) == "" {
		return models.NewPermanentDeliveryError("chat identifier is not set", nil)
	}
	text := msg.Body
	if msg.Subject != "" {
		text = msg.Subject + "\n\n" + msg.Body
	}
	body, err := json.Marshal(sendMessageRequest{ChatID: msg.Recipient, Text: text})
	if err != nil {
		return models.NewPermanentDeliveryError("failed to build the request", err)
	}

	endpoint := fmt.Sprintf("%s/bot%s/sendMessage", strings.TrimRight(s.cfg.APIBase, "/"), s.cfg.BotToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return models.NewPermanentDeliveryError("failed to build the request", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return models.NewTemporaryDeliveryError("Telegram is unavailable", err)
	}
	defer resp.Body.Close()

	var parsed apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil && resp.StatusCode == http.StatusOK {
		return models.NewTemporaryDeliveryError("malformed Telegram response", err)
	}
	if parsed.OK {
		return nil
	}
	return classify(resp.StatusCode, parsed)
}

func classify(statusCode int, resp apiResponse) error {
	reason := resp.Description
	if reason == "" {
		reason = fmt.Sprintf("Telegram returned status %d", statusCode)
	}
	switch {
	case resp.ErrorCode == http.StatusForbidden || statusCode == http.StatusForbidden:
		return models.NewPermanentDeliveryError("chat unavailable: "+reason, nil)
	case resp.ErrorCode == http.StatusBadRequest || statusCode == http.StatusBadRequest:
		return models.NewPermanentDeliveryError("Telegram rejected the message: "+reason, nil)
	case resp.ErrorCode == http.StatusNotFound || statusCode == http.StatusNotFound:
		return models.NewPermanentDeliveryError("chat not found: "+reason, nil)
	default:
		return models.NewTemporaryDeliveryError("temporary Telegram error: "+reason, nil)
	}
}

func (s *botSender) DeepLink(token string) string { return deepLink(s.cfg.BotName, token) }

func deepLink(botName, token string) string {
	return "https://t.me/" + url.PathEscape(strings.TrimPrefix(botName, "@")) + "?start=" + url.QueryEscape(token)
}
