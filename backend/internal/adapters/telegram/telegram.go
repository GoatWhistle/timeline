// Package telegram содержит адаптер отправки сообщений в Telegram и разбор
// ответов Bot API. Драйвер log пишет сообщение в журнал вместо отправки.
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

// Sender отправляет сообщение в чат Telegram.
type Sender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
	// DeepLink собирает одноразовую ссылку привязки чата к пользователю.
	DeepLink(token string) string
}

// New создаёт адаптер по конфигурации.
func New(cfg config.Telegram) Sender {
	if cfg.Driver == "bot" && cfg.BotToken != "" {
		return &botSender{cfg: cfg, client: &http.Client{Timeout: cfg.Timeout}}
	}
	return &logSender{cfg: cfg}
}

// logSender пишет сообщение в журнал вместо отправки.
type logSender struct{ cfg config.Telegram }

func (s *logSender) Send(ctx context.Context, msg models.OutboundMessage) error {
	slog.InfoContext(ctx, "сообщение Telegram не отправлено: активен драйвер log",
		"chat_id", msg.Recipient, "idempotency_key", msg.IdempotencyKey)
	return nil
}

func (s *logSender) DeepLink(token string) string { return deepLink(s.cfg.BotName, token) }

// botSender отправляет сообщение через Bot API.
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
		return models.NewPermanentDeliveryError("не задан идентификатор чата", nil)
	}
	text := msg.Body
	if msg.Subject != "" {
		text = msg.Subject + "\n\n" + msg.Body
	}
	body, err := json.Marshal(sendMessageRequest{ChatID: msg.Recipient, Text: text})
	if err != nil {
		return models.NewPermanentDeliveryError("не удалось собрать запрос", err)
	}

	endpoint := fmt.Sprintf("%s/bot%s/sendMessage", strings.TrimRight(s.cfg.APIBase, "/"), s.cfg.BotToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return models.NewPermanentDeliveryError("не удалось собрать запрос", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return models.NewTemporaryDeliveryError("Telegram недоступен", err)
	}
	defer resp.Body.Close()

	var parsed apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil && resp.StatusCode == http.StatusOK {
		return models.NewTemporaryDeliveryError("некорректный ответ Telegram", err)
	}
	if parsed.OK {
		return nil
	}
	return classify(resp.StatusCode, parsed)
}

// classify различает постоянные и временные отказы Bot API.
// Заблокированный или несуществующий чат и отозванная привязка — постоянные:
// повтор на этом канале бессмыслен.
func classify(statusCode int, resp apiResponse) error {
	reason := resp.Description
	if reason == "" {
		reason = fmt.Sprintf("Telegram вернул код %d", statusCode)
	}
	switch {
	case resp.ErrorCode == http.StatusForbidden || statusCode == http.StatusForbidden:
		return models.NewPermanentDeliveryError("чат недоступен: "+reason, nil)
	case resp.ErrorCode == http.StatusBadRequest || statusCode == http.StatusBadRequest:
		return models.NewPermanentDeliveryError("Telegram отклонил сообщение: "+reason, nil)
	case resp.ErrorCode == http.StatusNotFound || statusCode == http.StatusNotFound:
		return models.NewPermanentDeliveryError("чат не найден: "+reason, nil)
	default:
		return models.NewTemporaryDeliveryError("временная ошибка Telegram: "+reason, nil)
	}
}

func (s *botSender) DeepLink(token string) string { return deepLink(s.cfg.BotName, token) }

func deepLink(botName, token string) string {
	return "https://t.me/" + url.PathEscape(strings.TrimPrefix(botName, "@")) + "?start=" + url.QueryEscape(token)
}
