package config

import "fmt"

func (c *Config) validate() error {
	if c.DB.DSN == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.App.Env != "dev" && c.Auth.JWTSecret == "dev-insecure-secret-change-me" {
		return fmt.Errorf("JWT_SECRET is required outside the dev environment")
	}
	if len(c.Notify.Backoff) == 0 {
		return fmt.Errorf("NOTIFICATION_BACKOFF cannot be empty")
	}
	if c.Notify.MaxProviderCalls < 1 {
		return fmt.Errorf("NOTIFICATION_MAX_PROVIDER_CALLS must be at least 1")
	}
	if err := c.Avatar.validate(); err != nil {
		return err
	}
	return c.Cover.validate()
}
