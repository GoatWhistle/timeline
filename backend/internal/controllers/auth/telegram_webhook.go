package auth

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
)

type telegramUpdate = telegramlink.Update
type telegramMessage = telegramlink.Message
type telegramChat = telegramlink.Chat

type TelegramLinkCompleter interface {
	CompleteTelegramLink(ctx context.Context, token, chatID string, username *string) error
}

type TelegramWebhookController struct {
	svc    TelegramLinkCompleter
	secret string
	bot    *telegramlink.Bot
}

func NewTelegramWebhookController(svc TelegramLinkCompleter, secret string) *TelegramWebhookController {
	return &TelegramWebhookController{svc: svc, secret: secret}
}

func (c *TelegramWebhookController) WithBot(bot *telegramlink.Bot) *TelegramWebhookController {
	c.bot = bot
	return c
}

// @Summary		Telegram linking webhook
// @Description	Consumes a one-time /start token and binds the Telegram chat to its Timeline account.
// @Tags			telegram
// @Accept			json
// @Success		200
// @Failure		400
// @Failure		403
// @Router			/telegram/webhook [post]
func (c *TelegramWebhookController) Handle(w http.ResponseWriter, r *http.Request) {
	provided := r.Header.Get("X-Telegram-Bot-Api-Secret-Token")
	if c.secret == "" || subtle.ConstantTimeCompare([]byte(provided), []byte(c.secret)) != 1 {
		w.WriteHeader(http.StatusForbidden)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var update telegramUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		if errors.Is(err, io.EOF) {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	if err := c.dispatch(r.Context(), update); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func startToken(message *telegramMessage) (string, bool) {
	return telegramlink.StartToken(message)
}

func (c *TelegramWebhookController) dispatch(ctx context.Context, update telegramUpdate) error {
	if c.bot != nil {
		return c.bot.Handle(ctx, update)
	}
	return telegramlink.Handle(ctx, c.svc, update)
}
