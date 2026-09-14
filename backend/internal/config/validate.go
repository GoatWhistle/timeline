package config

import (
	"fmt"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

const maxOverdueLead = 30 * 24 * time.Hour

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
	if c.Notify.OverdueLead < 0 || c.Notify.OverdueLead > maxOverdueLead {
		return fmt.Errorf("NOTIFICATION_OVERDUE_LEAD must be between 0 and %s", maxOverdueLead)
	}
	if err := c.Avatar.validate(); err != nil {
		return err
	}
	return c.Cover.validate()
}
