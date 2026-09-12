package telegram

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

func TestPollingProtocolPreservesPendingUpdates(t *testing.T) {
	var methods []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		methods = append(methods, r.URL.Path)
		if r.Method != http.MethodPost {
			t.Error("expected POST")
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		switch r.URL.Path {
		case "/bottest/deleteWebhook":
			if body["drop_pending_updates"] != false {
				t.Error("queued messages would be discarded")
			}
			fmt.Fprint(w, `{"ok":true,"result":true}`)
		case "/bottest/getUpdates":
			if body["offset"] != float64(42) || body["timeout"] != float64(25) {
				t.Errorf("wrong request: %v", body)
			}
			allowed, _ := body["allowed_updates"].([]any)
			if len(allowed) != 2 || allowed[0] != "message" || allowed[1] != "callback_query" {
				t.Error("wrong update filter")
			}
			time.Sleep(50 * time.Millisecond)
			fmt.Fprint(w, `{"ok":true,"result":[{"update_id":42,"message":{"text":"/start token","chat":{"id":123,"type":"private"}}}]}`)
		default:
			t.Error("unexpected method", r.URL.Path)
		}
	}))
	defer server.Close()
	sender := New(config.Telegram{BotToken: "test", APIBase: server.URL, Timeout: 20 * time.Millisecond}).(*botSender)
	if err := sender.DeleteWebhook(context.Background()); err != nil {
		t.Fatal(err)
	}
	updates, err := sender.Updates(context.Background(), 42)
	if err != nil || len(updates) != 1 || updates[0].ID != 42 || updates[0].Message.Chat.ID != 123 {
		t.Fatalf("poll failed: updates=%v err=%v", updates, err)
	}
	if len(methods) != 2 {
		t.Fatalf("unexpected number of calls: %v", methods)
	}
}

func TestSendRetainsTimeoutAndRedactsToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
	}))
	defer server.Close()
	sender := New(config.Telegram{BotToken: "do-not-log-me", APIBase: server.URL, Timeout: 30 * time.Millisecond})
	start := time.Now()
	err := sender.Send(context.Background(), models.OutboundMessage{Recipient: "42", Body: "test"})
	if err == nil || strings.Contains(err.Error(), "do-not-log-me") {
		t.Fatalf("unsafe error: %v", err)
	}
	if time.Since(start) > time.Second {
		t.Fatal("send exceeded its configured timeout")
	}
}

func TestPollingErrorsNeverExposeBotToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprint(w, `{"ok":false,"description":"do-not-log-me rejected"}`)
	}))
	sender := New(config.Telegram{BotToken: "do-not-log-me", APIBase: server.URL, Timeout: time.Second}).(*botSender)
	err := sender.DeleteWebhook(context.Background())
	if err == nil || strings.Contains(err.Error(), "do-not-log-me") {
		t.Fatalf("unsafe response error: %v", err)
	}
	server.Close()
	err = sender.DeleteWebhook(context.Background())
	if err == nil || strings.Contains(err.Error(), "do-not-log-me") {
		t.Fatalf("unsafe connection error: %v", err)
	}
}

func TestBotRequestsDoNotFollowRedirects(t *testing.T) {
	redirected := false
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { redirected = true }))
	defer target.Close()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL+r.URL.Path, http.StatusTemporaryRedirect)
	}))
	defer server.Close()
	sender := New(config.Telegram{BotToken: "test", APIBase: server.URL, Timeout: time.Second}).(*botSender)
	if sender.DeleteWebhook(context.Background()) == nil || redirected {
		t.Fatal("followed a redirect with credentials")
	}
}
