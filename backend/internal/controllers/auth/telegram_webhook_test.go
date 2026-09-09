package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type telegramLinkCompleterStub struct {
	token    string
	chatID   string
	username *string
	err      error
}

func (s *telegramLinkCompleterStub) CompleteTelegramLink(_ context.Context, token, chatID string,
	username *string) error {
	s.token, s.chatID, s.username = token, chatID, username
	return s.err
}

func TestStartToken(t *testing.T) {
	text := "/start@goatwhistle_bot secret-token"
	message := &telegramMessage{Text: &text, Chat: telegramChat{ID: 42, Type: "private"}}

	token, ok := startToken(message)
	if !ok || token != "secret-token" {
		t.Fatalf("startToken() = %q, %v", token, ok)
	}
}

func TestStartTokenRejectsOtherMessages(t *testing.T) {
	for _, text := range []string{"/start", "hello", "/start one two"} {
		message := &telegramMessage{Text: &text, Chat: telegramChat{ID: 42, Type: "private"}}
		if _, ok := startToken(message); ok {
			t.Errorf("startToken accepted %q", text)
		}
	}
}

func TestTelegramWebhookLinksChat(t *testing.T) {
	username := "kaifarikman"
	stub := &telegramLinkCompleterStub{}
	controller := NewTelegramWebhookController(stub, "secret")
	body, _ := json.Marshal(map[string]any{"message": map[string]any{
		"text": "/start token-123",
		"chat": map[string]any{"id": 987, "type": "private", "username": username},
	}})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/telegram/webhook", strings.NewReader(string(body)))
	req.Header.Set("X-Telegram-Bot-Api-Secret-Token", "secret")
	rec := httptest.NewRecorder()

	controller.Handle(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("webhook status = %d", rec.Code)
	}
	if stub.token != "token-123" || stub.chatID != "987" || stub.username == nil || *stub.username != username {
		t.Fatalf("link call = token %q, chat %q, username %v", stub.token, stub.chatID, stub.username)
	}
}

func TestTelegramWebhookRejectsWrongSecret(t *testing.T) {
	stub := &telegramLinkCompleterStub{}
	controller := NewTelegramWebhookController(stub, "secret")
	req := httptest.NewRequest(http.MethodPost, "/api/v1/telegram/webhook", strings.NewReader(`{}`))
	req.Header.Set("X-Telegram-Bot-Api-Secret-Token", "wrong")
	rec := httptest.NewRecorder()

	controller.Handle(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("webhook status = %d", rec.Code)
	}
	if stub.token != "" {
		t.Fatal("webhook called service with an invalid secret")
	}
}

func TestTelegramWebhookRetriesInternalErrors(t *testing.T) {
	stub := &telegramLinkCompleterStub{err: errors.New("database unavailable")}
	controller := NewTelegramWebhookController(stub, "secret")
	body := `{"message":{"text":"/start token-123","chat":{"id":987,"type":"private"}}}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/telegram/webhook", strings.NewReader(body))
	req.Header.Set("X-Telegram-Bot-Api-Secret-Token", "secret")
	rec := httptest.NewRecorder()

	controller.Handle(rec, req)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("webhook status = %d", rec.Code)
	}
}
