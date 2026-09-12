package cli

import (
	"context"
	"fmt"

	"github.com/spf13/cobra"

	"github.com/GoatWhistle/timeline/internal/adapters/telegram"
	"github.com/GoatWhistle/timeline/internal/services/telegramlink"
)

func init() {
	commandBuilders = append(commandBuilders, func() *cobra.Command {
		return &cobra.Command{
			Use: "telegram-check", Short: "Check Telegram connectivity and bot credentials",
			RunE: func(cmd *cobra.Command, _ []string) error {
				cfg, err := loadConfig()
				if err != nil {
					return err
				}
				if err := telegram.New(cfg.Telegram).Check(cmd.Context()); err != nil {
					return err
				}
				fmt.Fprintln(cmd.OutOrStdout(), "Telegram API is reachable and bot credentials are valid")
				return nil
			},
		}
	})
}

func (c *container) runTelegram(ctx context.Context) {
	if c.cfg.Telegram.PollingEnabled {
		telegramlink.RunBot(ctx, c.telegram, c.telegramBot)
		return
	}
	if c.cfg.Telegram.WebhookURL != "" {
		telegramlink.RunWithRetry(ctx, "Telegram webhook registration", func(ctx context.Context) error {
			return c.telegram.SetWebhook(ctx,
				c.cfg.Telegram.WebhookURL, c.cfg.Telegram.WebhookSecret)
		}, false)
	}
}
