package config

import (
	"strings"
	"testing"
	"time"

	"github.com/GoatWhistle/timeline/internal/models"
)

func validConfig() *Config {
	cfg := &Config{}
	cfg.DB.DSN = "postgres://localhost/timeline"
	cfg.App.Env = "dev"
	cfg.Auth.JWTSecret = "dev-insecure-secret-change-me"
	cfg.Notify.Backoff = []time.Duration{time.Minute}
	cfg.Notify.MaxProviderCalls = models.MaxAttemptCount
	cfg.Notify.MaxRulesPerReg = models.MaxRuleSlots
	cfg.Notify.MaxOffsetMinutes = models.MaxRuleOffsetMinutes
	cfg.Avatar.MaxBytes = 1
	cfg.Avatar.MaxDimension = 1
	cfg.Cover.MaxBytes = 1
	cfg.Cover.MaxDimension = 1
	cfg.Cover.FetchTimeout = time.Second
	cfg.Cover.FetchMaxByte = 1
	return cfg
}

func TestBaselineConfigurationIsAccepted(t *testing.T) {
	if err := validConfig().validate(); err != nil {
		t.Fatalf("the baseline configuration is rejected: %v", err)
	}
}

func TestNotificationLimitsCannotExceedTheStoredCeiling(t *testing.T) {
	cases := map[string]struct {
		setting string
		raise   func(*Config)
		lower   func(*Config)
	}{
		"provider calls beyond notifications.attempt_count": {
			setting: "NOTIFICATION_MAX_PROVIDER_CALLS",
			raise:   func(c *Config) { c.Notify.MaxProviderCalls = models.MaxAttemptCount + 1 },
			lower:   func(c *Config) { c.Notify.MaxProviderCalls = 0 },
		},
		"rules beyond notification_rules.slot_no": {
			setting: "NOTIFICATION_MAX_RULES",
			raise:   func(c *Config) { c.Notify.MaxRulesPerReg = models.MaxRuleSlots + 1 },
			lower:   func(c *Config) { c.Notify.MaxRulesPerReg = 0 },
		},
		"offset beyond notification_rules.offset_minutes": {
			setting: "NOTIFICATION_MAX_OFFSET_MINUTES",
			raise:   func(c *Config) { c.Notify.MaxOffsetMinutes = models.MaxRuleOffsetMinutes + 1 },
			lower:   func(c *Config) { c.Notify.MaxOffsetMinutes = 0 },
		},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			cfg := validConfig()
			tc.raise(cfg)
			err := cfg.validate()
			if err == nil {
				t.Fatalf("a value above the schema ceiling was accepted: the database check "+
					"constraint would reject the row that %s permits", tc.setting)
			}
			if !strings.Contains(err.Error(), tc.setting) {
				t.Fatalf("the rejection does not name the setting to correct: %v", err)
			}

			cfg = validConfig()
			tc.lower(cfg)
			if err := cfg.validate(); err == nil {
				t.Fatalf("a value below one was accepted for %s", tc.setting)
			}
		})
	}
}
