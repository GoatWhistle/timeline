package telegram

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Sender interface {
	Send(ctx context.Context, msg models.OutboundMessage) error
	DeepLink(token string) string
}

type WebhookRegistrar interface {
	SetWebhook(ctx context.Context, webhookURL, secret string) error
}

type CallbackAnswerer interface {
	AnswerCallbackQuery(ctx context.Context, callbackQueryID, text string) error
}

type MessageEditor interface {
	EditMessage(ctx context.Context, chatID string, messageID int, text string) error
}

func New(cfg config.Telegram) Client {
	return &botSender{cfg: cfg, client: newClient(cfg)}
}

type botSender struct {
	cfg    config.Telegram
	client *http.Client
}

type sendMessageRequest struct {
	ChatID      string       `json:"chat_id"`
	Text        string       `json:"text"`
	ParseMode   string       `json:"parse_mode,omitempty"`
	ReplyMarkup *replyMarkup `json:"reply_markup,omitempty"`
}

type editMessageRequest struct {
	ChatID    string `json:"chat_id"`
	MessageID int    `json:"message_id"`
	Text      string `json:"text"`
	ParseMode string `json:"parse_mode,omitempty"`
}

type replyMarkup struct {
	InlineKeyboard [][]inlineButton `json:"inline_keyboard"`
}

type inlineButton struct {
	Text         string `json:"text"`
	URL          string `json:"url,omitempty"`
	CallbackData string `json:"callback_data,omitempty"`
}

type apiResponse struct {
	OK          bool   `json:"ok"`
	ErrorCode   int    `json:"error_code"`
	Description string `json:"description"`
}

func (s *botSender) Send(ctx context.Context, msg models.OutboundMessage) error {
	ctx, cancel := context.WithTimeout(ctx, s.cfg.Timeout)
	defer cancel()
	if strings.TrimSpace(msg.Recipient) == "" {
		return models.NewPermanentDeliveryError("chat identifier is not set", nil)
	}
	text := msg.Body
	if msg.Subject != "" {
		text = msg.Subject + "\n\n" + msg.Body
	}
	body, err := json.Marshal(sendMessageRequest{
		ChatID: msg.Recipient, Text: text, ParseMode: parseMode(msg), ReplyMarkup: buttonMarkup(msg),
	})
	if err != nil {
		return models.NewPermanentDeliveryError("failed to build the request", s.redactError(err))
	}

	endpoint := fmt.Sprintf("%s/bot%s/sendMessage", strings.TrimRight(s.cfg.APIBase, "/"), s.cfg.BotToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return models.NewPermanentDeliveryError("failed to build the request", s.redactError(err))
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return models.NewTemporaryDeliveryError("Telegram is unavailable", s.redactError(err))
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

func (s *botSender) SetWebhook(ctx context.Context, webhookURL, secret string) error {
	return s.call(ctx, "setWebhook", map[string]any{
		"url": webhookURL, "secret_token": secret, "allowed_updates": allowedUpdateTypes,
	}, nil, s.cfg.Timeout)
}

func (s *botSender) EditMessage(ctx context.Context, chatID string, messageID int, text string) error {
	err := s.call(ctx, "editMessageText", editMessageRequest{
		ChatID: chatID, MessageID: messageID, Text: text, ParseMode: "HTML",
	}, nil, s.cfg.Timeout)
	if err == nil {
		return nil
	}
	return models.NewTemporaryDeliveryError("failed to edit the Telegram message", err)
}

func (s *botSender) AnswerCallbackQuery(ctx context.Context, callbackQueryID, text string) error {
	return s.call(ctx, "answerCallbackQuery", map[string]any{
		"callback_query_id": callbackQueryID, "text": text,
	}, nil, s.cfg.Timeout)
}

func buttonMarkup(msg models.OutboundMessage) *replyMarkup {
	var row []inlineButton
	if msg.OpenURL != "" {
		row = append(row, inlineButton{Text: msg.OpenText, URL: msg.OpenURL})
	}
	if msg.ButtonData != "" {
		row = append(row, inlineButton{Text: msg.ButtonText, CallbackData: msg.ButtonData})
	}
	if len(row) == 0 {
		return nil
	}
	return &replyMarkup{InlineKeyboard: [][]inlineButton{row}}
}

func parseMode(msg models.OutboundMessage) string {
	if msg.TelegramHTML {
		return "HTML"
	}
	return ""
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
