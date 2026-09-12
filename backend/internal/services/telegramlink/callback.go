package telegramlink

import (
	"context"
	"html"
	"log/slog"
	"strconv"
	"strings"

	"github.com/GoatWhistle/timeline/internal/locale"
	"github.com/GoatWhistle/timeline/internal/models"
)

const registrationDoneCallback = "reg_done:"

const (
	keyRegistrationConfirmed = "notification.telegram.registration.confirmed"
	keyRegistrationFailed    = "notification.telegram.registration.failed"
)

func RegistrationDoneCallbackData(eventDisplayID string) string {
	return registrationDoneCallback + eventDisplayID
}

func (b *Bot) handleCallback(ctx context.Context, callback *CallbackQuery) error {
	eventDisplayID, ok := strings.CutPrefix(callback.Data, registrationDoneCallback)
	if !ok {
		return b.answer(ctx, callback.ID, "")
	}

	lang, _, _ := strings.Cut(callback.From.LanguageCode, "-")
	failed := locale.Message(lang, keyRegistrationFailed)
	user, err := b.userForCallback(ctx, callback)
	if err != nil {
		b.markResolved(ctx, callback, failed)
		return b.answer(ctx, callback.ID, failed)
	}

	eventID, err := b.status.ResolveEventDisplayID(ctx, eventDisplayID)
	if err != nil {
		b.markResolved(ctx, callback, failed)
		return b.answer(ctx, callback.ID, failed)
	}

	actor := models.Actor{UserID: user.ID}
	if _, err := b.status.MarkDone(ctx, actor, eventID); err != nil {
		slog.WarnContext(ctx, "could not confirm registration from Telegram",
			"error", err, "event_id", eventDisplayID)
		b.markResolved(ctx, callback, failed)
		return b.answer(ctx, callback.ID, failed)
	}
	confirmed := locale.Message(lang, keyRegistrationConfirmed)
	b.markResolved(ctx, callback, confirmed)
	return b.answer(ctx, callback.ID, confirmed)
}

func (b *Bot) markResolved(ctx context.Context, callback *CallbackQuery, note string) {
	if b.editor == nil || callback.Message == nil {
		return
	}
	chatID := strconv.FormatInt(callback.Message.Chat.ID, 10)
	text := note
	if callback.Message.Text != nil && *callback.Message.Text != "" {
		text = html.EscapeString(*callback.Message.Text) + "\n\n<b>" + html.EscapeString(note) + "</b>"
	}
	if err := b.editor.EditMessage(ctx, chatID, callback.Message.ID, text); err != nil {
		slog.WarnContext(ctx, "could not edit the Telegram message after the callback", "error", err)
	}
}

func (b *Bot) userForCallback(ctx context.Context, callback *CallbackQuery) (*models.User, error) {
	chatID := ""
	if callback.Message != nil {
		chatID = strconv.FormatInt(callback.Message.Chat.ID, 10)
	}
	if chatID == "" {
		return nil, models.ErrNotFound
	}
	return b.users.GetByTelegramChatID(ctx, chatID)
}

func (b *Bot) answer(ctx context.Context, callbackQueryID, text string) error {
	if b.answerer == nil {
		return nil
	}
	if err := b.answerer.AnswerCallbackQuery(ctx, callbackQueryID, text); err != nil {
		slog.WarnContext(ctx, "could not answer Telegram callback query", "error", err)
	}
	return nil
}
