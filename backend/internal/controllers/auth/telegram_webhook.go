package auth

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/GoatWhistle/timeline/internal/models"
)

type telegramUpdate struct {
	Message *telegramMessage `json:"message"`
}

type telegramMessage struct {
	Text *string      `json:"text"`
	Chat telegramChat `json:"chat"`
}

type telegramChat struct {
	ID       int64   `json:"id"`
	Username *string `json:"username"`
}

type TelegramLinkCompleter interface {
	CompleteTelegramLink(ctx context.Context, token, chatID string, username *string) error
}

type TelegramWebhookController struct {
	svc    TelegramLinkCompleter
	secret string
}

func NewTelegramWebhookController(svc TelegramLinkCompleter, secret string) *TelegramWebhookController {
	return &TelegramWebhookController{svc: svc, secret: secret}
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
	token, ok := startToken(update.Message)
	if !ok {
		w.WriteHeader(http.StatusOK)
		return
	}

	chatID := strconv.FormatInt(update.Message.Chat.ID, 10)
	if err := c.svc.CompleteTelegramLink(r.Context(), token, chatID, update.Message.Chat.Username); err != nil {
		if errors.Is(err, models.ErrNotFound) || errors.Is(err, models.ErrConflict) {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func startToken(message *telegramMessage) (string, bool) {
	if message == nil || message.Text == nil || message.Chat.ID == 0 {
		return "", false
	}
	parts := strings.Fields(*message.Text)
	if len(parts) != 2 {
		return "", false
	}
	command := strings.SplitN(parts[0], "@", 2)[0]
	if command != "/start" || parts[1] == "" {
		return "", false
	}
	return parts[1], true
}
