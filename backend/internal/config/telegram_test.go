package config

import (
	"testing"
	"time"
)

func TestTelegramConfiguration(t *testing.T) {
	for name, cfg := range map[string]Telegram{
		"missing token":          {PollingEnabled: true, Timeout: time.Second},
		"two receivers":          {PollingEnabled: true, BotToken: "test", WebhookURL: "https://example.com", Timeout: time.Second},
		"missing webhook secret": {WebhookURL: "https://example.com", Timeout: time.Second},
		"bad timeout":            {},
		"bad address":            {Timeout: time.Second, DirectIPs: []string{"api.telegram.org"}},
	} {
		t.Run(name, func(t *testing.T) {
			if cfg.validate() == nil {
				t.Fatal("invalid configuration accepted")
			}
		})
	}
	cfg := Telegram{PollingEnabled: true, BotToken: "test", Timeout: time.Second, DirectIPs: []string{"149.154.167.220"}}
	if err := cfg.validate(); err != nil {
		t.Fatal(err)
	}
}
