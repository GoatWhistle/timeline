//go:build integration

package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/adapters/postgres/audit"
	"github.com/GoatWhistle/timeline/internal/adapters/postgres/identity"
	"github.com/GoatWhistle/timeline/internal/adapters/telegram"
	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
	"github.com/GoatWhistle/timeline/internal/services/auth"
	sharedaudit "github.com/GoatWhistle/timeline/internal/services/shared/audit"
	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
	"github.com/GoatWhistle/timeline/internal/testsupport"
)

func TestTelegramPollingConsumesRealLinkTokenOnce(t *testing.T) {
	db := testsupport.DB(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	users := identity.NewUsers(db)
	user, err := users.Create(ctx, &models.User{
		FirstName: "Polling", LastName: "Test", Email: "polling@example.com", PasswordHash: "test", IsActive: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	var token string
	acknowledged := make(chan struct{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/bottest/deleteWebhook" {
			fmt.Fprint(w, `{"ok":true,"result":true}`)
			return
		}
		if r.URL.Path != "/bottest/getUpdates" {
			t.Error("unexpected method", r.URL.Path)
			w.WriteHeader(404)
			return
		}
		var request struct {
			Offset int64 `json:"offset"`
		}
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Error(err)
			return
		}
		if request.Offset == 3 {
			acknowledged <- struct{}{}
			cancel()
			return
		}
		chatID, updateID := int64(123), int64(1)
		if request.Offset == 2 {
			chatID, updateID = 999, 2
		}
		text := "/start " + token
		update := telegramlink.Update{ID: updateID, Message: &telegramlink.Message{
			Text: &text, Chat: telegramlink.Chat{ID: chatID, Type: "private"},
		}}
		if err := json.NewEncoder(w).Encode(map[string]any{"ok": true, "result": []telegramlink.Update{update}}); err != nil {
			t.Error(err)
		}
	}))
	defer server.Close()
	cfg := &config.Config{Auth: config.Auth{TelegramLinkTTL: time.Hour},
		Telegram: config.Telegram{APIBase: server.URL, BotToken: "test", BotName: "testbot", Timeout: time.Second}}
	sender := telegram.New(cfg.Telegram)
	profile := auth.NewProfileService(db, users, identity.NewTokens(db), nil, nil, nil, nil, nil,
		sharedaudit.NewAuditService(audit.NewAudit(db)), nil, nil, sender, cfg)
	link, _, err := profile.StartTelegramLink(ctx, models.Actor{UserID: user.ID})
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(link)
	if err != nil {
		t.Fatal(err)
	}
	token = parsed.Query().Get("start")
	if token == "" {
		t.Fatal("deep link has no token")
	}
	source, ok := sender.(telegramlink.Source)
	if !ok {
		t.Fatal("sender cannot poll")
	}
	telegramlink.Run(ctx, source, profile)
	select {
	case <-acknowledged:
	default:
		t.Fatal("poller did not acknowledge both updates")
	}
	stored, err := users.GetByID(context.Background(), user.ID)
	if err != nil {
		t.Fatal(err)
	}
	if stored.TelegramChatID == nil || *stored.TelegramChatID != "123" {
		t.Fatalf("link was not saved or token replay replaced it: %v", stored.TelegramChatID)
	}
	var entries int
	if err := db.Pool().QueryRow(context.Background(),
		`SELECT count(*) FROM audit_log WHERE entity_id = $1 AND action = $2`,
		user.ID, models.AuditUserProfileChange).Scan(&entries); err != nil {
		t.Fatal(err)
	}
	if entries != 1 {
		t.Fatalf("expected one audited link, got %d", entries)
	}
}
