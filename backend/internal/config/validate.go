package config

import (
	"fmt"

	"github.com/GoatWhistle/timeline/internal/models"
)

func (c *Config) validate() error {
	if c.DB.DSN == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if err := c.Telegram.validate(); err != nil {
		return err
	}
	if err := c.resolveJWTSecret(); err != nil {
		return err
	}
	if len(c.Notify.Backoff) == 0 {
		return fmt.Errorf("NOTIFICATION_BACKOFF cannot be empty")
	}
	if c.Notify.MaxProviderCalls < 1 || c.Notify.MaxProviderCalls > models.MaxAttemptCount {
		return fmt.Errorf("NOTIFICATION_MAX_PROVIDER_CALLS must be between 1 and %d",
			models.MaxAttemptCount)
	}
	if c.Notify.MaxRulesPerReg < 1 || c.Notify.MaxRulesPerReg > models.MaxRuleSlots {
		return fmt.Errorf("NOTIFICATION_MAX_RULES must be between 1 and %d", models.MaxRuleSlots)
	}
	if c.Notify.MaxOffsetMinutes < 1 || c.Notify.MaxOffsetMinutes > models.MaxRuleOffsetMinutes {
		return fmt.Errorf("NOTIFICATION_MAX_OFFSET_MINUTES must be between 1 and %d",
			models.MaxRuleOffsetMinutes)
	}
	if err := c.Avatar.validate(); err != nil {
		return err
	}
	return c.Cover.validate()
}
