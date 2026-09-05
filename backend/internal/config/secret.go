package config

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log/slog"
	"net/url"
	"strings"
)

const (
	EnvDev  = "dev"
	envProd = "prod"

	minSecretLength   = 32
	minSecretDistinct = 8

	generatedSecretBytes = 32
)

var knownWeakSecrets = map[string]struct{}{
	"dev-insecure-secret-change-me": {},
	"change-me":                     {},
	"changeme":                      {},
	"secret":                        {},
	"password":                      {},
	"insecure":                      {},
	"test":                          {},
}

func (c *Config) isDev() bool { return c.App.Env == EnvDev }

func secretWeakness(secret string) string {
	if secret == "" {
		return "it is empty"
	}
	if _, known := knownWeakSecrets[secret]; known {
		return "it is a placeholder published in the repository"
	}
	if len(secret) < minSecretLength {
		return fmt.Sprintf("it is %d bytes, below the %d-byte minimum", len(secret), minSecretLength)
	}
	distinct := map[rune]struct{}{}
	for _, r := range secret {
		distinct[r] = struct{}{}
	}
	if len(distinct) < minSecretDistinct {
		return fmt.Sprintf("it repeats only %d distinct characters, below the %d required",
			len(distinct), minSecretDistinct)
	}
	return ""
}

func generateSecret() (string, error) {
	buf := make([]byte, generatedSecretBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate a development JWT_SECRET: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func (c *Config) resolveJWTSecret() error {
	weakness := secretWeakness(c.Auth.JWTSecret)
	if weakness == "" {
		return nil
	}
	if !c.isDev() {
		return fmt.Errorf(
			"JWT_SECRET is unusable because %s; set it to at least %d random bytes, "+
				"or set APP_ENV=dev to run an insecure development stack",
			weakness, minSecretLength)
	}
	generated, err := generateSecret()
	if err != nil {
		return err
	}
	c.Auth.JWTSecret = generated
	slog.Warn("JWT_SECRET was unusable and a random one was generated for this process",
		"reason", weakness, "env", c.App.Env,
		"consequence", "every session ends when the process restarts")
	return nil
}

func (c *Config) WarnInsecureDefaults() {
	if c.isDev() {
		slog.Warn("APP_ENV=dev disables production safeguards",
			"jwt_secret_generated_when_weak", true, "email_links_logged", true)
	}
	if !c.HTTP.CookieSecure {
		slog.Warn("COOKIE_SECURE=false sends session cookies over plain HTTP",
			"setting", "COOKIE_SECURE", "required_for", "any HTTPS deployment")
	}
	if c.Ops.MetricsToken == "" {
		slog.Warn("METRICS_TOKEN is empty and /metrics is open to anyone reaching the port",
			"setting", "METRICS_TOKEN")
	}
	if c.HTTP.SwaggerEnabled && !c.isDev() {
		slog.Warn("SWAGGER_ENABLED=true publishes the API contract anonymously at /docs/",
			"setting", "SWAGGER_ENABLED")
	}
	if !c.isDev() && dsnDisablesTLS(c.DB.DSN) {
		slog.Warn("DATABASE_URL disables TLS to PostgreSQL",
			"setting", "DATABASE_URL", "parameter", "sslmode=disable")
	}
}

func dsnDisablesTLS(dsn string) bool {
	parsed, err := url.Parse(dsn)
	if err != nil {
		return strings.Contains(dsn, "sslmode=disable")
	}
	return parsed.Query().Get("sslmode") == "disable"
}
