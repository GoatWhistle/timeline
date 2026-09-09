package telegramlink

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
)

type Update struct {
	ID      int64    `json:"update_id"`
	Message *Message `json:"message"`
}

type Message struct {
	Text *string `json:"text"`
	Chat Chat    `json:"chat"`
}

type Chat struct {
	ID       int64   `json:"id"`
	Type     string  `json:"type"`
	Username *string `json:"username"`
}

type Completer interface {
	CompleteTelegramLink(context.Context, string, string, *string) error
}

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
	token, ok := StartToken(update.Message)
	if !ok {
		return nil
	}
	chat := update.Message.Chat
	err := completer.CompleteTelegramLink(ctx, token, strconv.FormatInt(chat.ID, 10), chat.Username)
	if errors.Is(err, models.ErrNotFound) || errors.Is(err, models.ErrConflict) {
		return nil
	}
	return err
}
