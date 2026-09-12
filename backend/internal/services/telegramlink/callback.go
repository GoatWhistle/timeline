package telegramlink

import (
	"context"
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
	user, err := b.userForCallback(ctx, callback)
	if err != nil {
		return b.answer(ctx, callback.ID, locale.Message(lang, keyRegistrationFailed))
	}

	eventID, err := b.status.ResolveEventDisplayID(ctx, eventDisplayID)
	if err != nil {
		return b.answer(ctx, callback.ID, locale.Message(lang, keyRegistrationFailed))
	}

	actor := models.Actor{UserID: user.ID}
	if _, err := b.status.MarkDone(ctx, actor, eventID); err != nil {
		slog.WarnContext(ctx, "could not confirm registration from Telegram",
			"error", err, "event_id", eventDisplayID)
		return b.answer(ctx, callback.ID, locale.Message(lang, keyRegistrationFailed))
	}
	return b.answer(ctx, callback.ID, locale.Message(lang, keyRegistrationConfirmed))
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
