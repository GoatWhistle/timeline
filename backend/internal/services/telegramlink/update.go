package telegramlink

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Update struct {
	ID            int64          `json:"update_id"`
	Message       *Message       `json:"message"`
	CallbackQuery *CallbackQuery `json:"callback_query"`
}

type Message struct {
	Text *string `json:"text"`
	Chat Chat    `json:"chat"`
	From *Sender `json:"from"`
}

type CallbackQuery struct {
	ID      string   `json:"id"`
	Data    string   `json:"data"`
	From    Sender   `json:"from"`
	Message *Message `json:"message"`
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
	keyHelp   = "notification.telegram.help"
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

func (b *Bot) Handle(ctx context.Context, update Update) error {
	switch {
	case update.CallbackQuery != nil:
		return b.handleCallback(ctx, update.CallbackQuery)
	case update.Message != nil:
		return b.handleMessage(ctx, update.Message)
	default:
		return nil
	}
}

func (b *Bot) handleMessage(ctx context.Context, message *Message) error {
	command, ok := parseCommand(message)
	if !ok {
		return HandleWithReply(ctx, b.completer, b.replier, Update{Message: message})
	}
	switch command {
	case cmdStart:
		return HandleWithReply(ctx, b.completer, b.replier, Update{Message: message})
	case cmdStatus:
		return b.handleStatus(ctx, message)
	case cmdMute:
		return b.handleMute(ctx, message, true)
	case cmdUnmute:
		return b.handleMute(ctx, message, false)
	case cmdHelp:
		reply(ctx, b.replier, message, keyHelp)
		return nil
	default:
		reply(ctx, b.replier, message, keyHint)
		return nil
	}
}

func reply(ctx context.Context, replier Replier, message *Message, key string) {
	send(ctx, replier, message, locale.Message(messageLang(message), key))
}
