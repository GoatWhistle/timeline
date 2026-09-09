package config

import (
	"fmt"
	"net"
	"time"
)

type Telegram struct {
	BotToken       string
	BotName        string
	APIBase        string
	Timeout        time.Duration
	WebhookURL     string
	WebhookSecret  string
	PollingEnabled bool
	DirectIPs      []string
}

func loadTelegram() Telegram {
	return Telegram{
		BotToken:       env("TELEGRAM_BOT_TOKEN", ""),
		BotName:        env("TELEGRAM_BOT_NAME", "timeline_bot"),
		APIBase:        env("TELEGRAM_API_BASE", "https://api.telegram.org"),
		Timeout:        envDuration("TELEGRAM_TIMEOUT", 10*time.Second),
		WebhookURL:     env("TELEGRAM_WEBHOOK_URL", ""),
		WebhookSecret:  env("TELEGRAM_WEBHOOK_SECRET", ""),
		PollingEnabled: envBool("TELEGRAM_POLLING_ENABLED", false),
		DirectIPs:      envList("TELEGRAM_DIRECT_IPS", nil),
	}
}

func (c Telegram) validate() error {
	if c.Timeout <= 0 {
		return fmt.Errorf("TELEGRAM_TIMEOUT must be positive")
	}
	if c.PollingEnabled && c.BotToken == "" {
		return fmt.Errorf("TELEGRAM_BOT_TOKEN is required for polling")
	}
	if c.PollingEnabled && c.WebhookURL != "" {
		return fmt.Errorf("Telegram polling and webhook cannot both be enabled")
	}
	if c.WebhookURL != "" && c.WebhookSecret == "" {
		return fmt.Errorf("TELEGRAM_WEBHOOK_SECRET is required when TELEGRAM_WEBHOOK_URL is set")
	}
	for _, ip := range c.DirectIPs {
		if net.ParseIP(ip) == nil {
			return fmt.Errorf("TELEGRAM_DIRECT_IPS must contain IP addresses")
		}
	}
	return nil
}
