package auth

import (
	"testing"

	"github.com/GoatWhistle/timeline/internal/models"
)

func TestTelegramRecipientIsEmptyWithoutALinkedChat(t *testing.T) {
	user := &models.User{NotificationChannels: models.ChannelSet{models.ChannelTelegram}}
	got := telegramRecipient(user)
	if got.ChatID != "" || got.Enabled {
		t.Fatalf("expected no telegram recipient for an unlinked account, got %+v", got)
	}
}

func TestTelegramRecipientCarriesTheChatIDWhenLinkedAndUnmuted(t *testing.T) {
	chatID := "42"
	user := &models.User{
		TelegramChatID:       &chatID,
		NotificationChannels: models.ChannelSet{models.ChannelTelegram},
	}
	got := telegramRecipient(user)
	if got.ChatID != "42" || !got.Enabled {
		t.Fatalf("expected an enabled recipient for chat 42, got %+v", got)
	}
}

func TestTelegramRecipientIsDisabledWhenTheChannelIsMuted(t *testing.T) {
	chatID := "42"
	user := &models.User{TelegramChatID: &chatID, NotificationChannels: models.ChannelSet{}}
	got := telegramRecipient(user)
	if got.Enabled {
		t.Fatalf("the telegram channel was muted, the recipient must not be enabled, got %+v", got)
	}
}
