package telegramlink

import (
	"context"
	"errors"
	"log/slog"
	"strconv"
	"strings"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Update struct {
	ID      int64    `json:"update_id"`
	Message *Message `json:"message"`
}

type Message struct {
	Text *string `json:"text"`
	Chat Chat    `json:"chat"`
	From *Sender `json:"from"`
}

type Sender struct {
	LanguageCode string `json:"language_code"`
}

type Chat struct {
	ID       int64   `json:"id"`
	Type     string  `json:"type"`
	Username *string `json:"username"`
}

type Completer interface {
	CompleteTelegramLink(context.Context, string, string, *string) error
}

type Replier interface {
	Send(context.Context, models.OutboundMessage) error
}

const (
	keyLinked = "notification.telegram.linked"
	keyStale  = "notification.telegram.stale"
	keyHint   = "notification.telegram.hint"
)

func StartToken(message *Message) (string, bool) {
	if message == nil || message.Text == nil || message.Chat.ID <= 0 || message.Chat.Type != "private" {
		return "", false
	}
	parts := strings.Fields(*message.Text)
	if len(parts) != 2 || strings.SplitN(parts[0], "@", 2)[0] != "/start" {
		return "", false
	}
	return parts[1], true
}

func Handle(ctx context.Context, completer Completer, update Update) error {
	return HandleWithReply(ctx, completer, nil, update)
}

func HandleWithReply(ctx context.Context, completer Completer, replier Replier, update Update) error {
	token, ok := StartToken(update.Message)
	if !ok {
		reply(ctx, replier, update.Message, keyHint)
		return nil
	}
	chat := update.Message.Chat
	err := completer.CompleteTelegramLink(ctx, token, strconv.FormatInt(chat.ID, 10), chat.Username)
	if errors.Is(err, models.ErrNotFound) || errors.Is(err, models.ErrConflict) {
		reply(ctx, replier, update.Message, keyStale)
		return nil
	}
	if err != nil {
		return err
	}
	reply(ctx, replier, update.Message, keyLinked)
	return nil
}

func reply(ctx context.Context, replier Replier, message *Message, key string) {
	if replier == nil || message == nil || message.Chat.ID <= 0 || message.Chat.Type != "private" {
		return
	}
	lang := ""
	if message.From != nil {
		lang, _, _ = strings.Cut(message.From.LanguageCode, "-")
	}
	err := replier.Send(ctx, models.OutboundMessage{
		Recipient: strconv.FormatInt(message.Chat.ID, 10),
		Body:      locale.Message(lang, key),
	})
	if err != nil {
		slog.WarnContext(ctx, "could not answer in Telegram", "error", err)
	}
}
