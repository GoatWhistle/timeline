package config

import (
	"strings"
	"testing"
)

func TestTheProductionDefaultRejectsTheSecretPublishedInTheRepository(t *testing.T) {
	cfg := validConfig()
	cfg.App.Env = envProd
	cfg.Auth.JWTSecret = "dev-insecure-secret-change-me"

	err := cfg.validate()
	if err == nil {
		t.Fatal("the secret committed to .env.example was accepted outside dev: " +
			"anyone who read the repository can forge an administrator session")
	}
	if !strings.Contains(err.Error(), "JWT_SECRET") {
		t.Fatalf("the rejection does not name the setting to correct: %v", err)
	}
	if cfg.Auth.JWTSecret != "dev-insecure-secret-change-me" {
		t.Fatal("a rejected configuration must not be silently repaired outside dev")
	}
}

func TestAnUnsetEnvironmentIsTreatedAsProduction(t *testing.T) {
	t.Setenv("APP_ENV", "")
	t.Setenv("DATABASE_URL", "postgres://localhost/timeline")
	t.Setenv("JWT_SECRET", "dev-insecure-secret-change-me")

	if _, err := Load(); err == nil {
		t.Fatal("a deployment that never set APP_ENV started on the published secret: " +
			"the unsafe state must require an explicit APP_ENV=dev, not silence")
	}
}

func TestWeakSecretsAreRejectedByStrengthNotByEquality(t *testing.T) {
	cases := map[string]string{
		"a short human-chosen password": "changeme123",
		"an empty secret":               "",
		"one repeated character":        strings.Repeat("a", 64),
		"a short random string":         "8Kq2mZx",
	}

	for name, secret := range cases {
		t.Run(name, func(t *testing.T) {
			cfg := validConfig()
			cfg.App.Env = envProd
			cfg.Auth.JWTSecret = secret
			if err := cfg.validate(); err == nil {
				t.Fatalf("a weak secret was accepted in production: %q", secret)
			}
		})
	}
}

func TestAStrongSecretIsAcceptedInProduction(t *testing.T) {
	cfg := validConfig()
	cfg.App.Env = envProd
	cfg.Auth.JWTSecret = "GHm3TqPz7Vd1XbNs9RkLwYcE4jUaFo2t"

	if err := cfg.validate(); err != nil {
		t.Fatalf("a 32-byte mixed secret was rejected in production: %v", err)
	}
}

func TestDevelopmentGeneratesASecretInsteadOfDemandingOne(t *testing.T) {
	cfg := validConfig()
	cfg.App.Env = EnvDev
	cfg.Auth.JWTSecret = ""

	if err := cfg.validate(); err != nil {
		t.Fatalf("development was made to require manual setup: %v", err)
	}
	if secretWeakness(cfg.Auth.JWTSecret) != "" {
		t.Fatalf("the generated development secret is itself weak: %q", cfg.Auth.JWTSecret)
	}

	other := validConfig()
	other.App.Env = EnvDev
	other.Auth.JWTSecret = ""
	if err := other.validate(); err != nil {
		t.Fatalf("the second load failed: %v", err)
	}
	if other.Auth.JWTSecret == cfg.Auth.JWTSecret {
		t.Fatal("two processes generated the same development secret, so it is not random")
	}
}

func TestDsnTlsWarningReadsTheSslmodeParameter(t *testing.T) {
	cases := map[string]struct {
		dsn      string
		disabled bool
	}{
		"sslmode=disable":                  {"postgres://h/db?sslmode=disable", true},
		"sslmode=require":                  {"postgres://h/db?sslmode=require", false},
		"no sslmode":                       {"postgres://h/db", false},
		"disable named in the database":    {"postgres://h/sslmode=disable", false},
		"disable behind another parameter": {"postgres://h/db?a=1&sslmode=disable", true},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			if got := dsnDisablesTLS(tc.dsn); got != tc.disabled {
				t.Fatalf("dsnDisablesTLS(%q) = %v, want %v", tc.dsn, got, tc.disabled)
			}
		})
	}
}
