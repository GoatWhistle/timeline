package config

import (
	"fmt"
	"strings"
	"time"
)

type Config struct {
	App      App
	HTTP     HTTP
	DB       DB
	Auth     Auth
	Argon    Argon
	RateLim  RateLim
	Notify   Notify
	Retent   Retention
	Telegram Telegram
	Email    Email
	Ops      Ops
	Personal Personal
	Digest   Digest
	Realtime Realtime
	Links    ResourceLinks
	Avatar   Avatar
}

type App struct {
	Env        string
	LogLevel   string
	LogFormat  string
	LogColor   string
	SystemTZ   *time.Location
	SystemTZID string
	PublicURL  string
}

type HTTP struct {
	Addr            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
	CORSOrigins     []string
	CookieDomain    string
	CookieSecure    bool
	SwaggerEnabled  bool
}

type DB struct {
	DSN             string
	MaxConns        int32
	MinConns        int32
	MaxConnLifetime time.Duration
	AppRole         string
}

type Auth struct {
	JWTSecret          string
	AccessTTL          time.Duration
	RefreshTTL         time.Duration
	EmailVerifyTTL     time.Duration
	PasswordResetTTL   time.Duration
	InviteTTL          time.Duration
	TeamJoinLinkTTL    time.Duration
	TelegramLinkTTL    time.Duration
	MinPasswordLength  int
	FirstAdminEmail    string
	FirstAdminPassword string
	FirstAdminName     string
}

type Argon struct {
	Memory      uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

type Notify struct {
	SchedulerInterval time.Duration
	SchedulerBatch    int
	WorkerInterval    time.Duration
	WorkerBatch       int
	LeaseTTL          time.Duration
	RecoveryInterval  time.Duration
	MaxProviderCalls  int
	Backoff           []time.Duration
	MaxRulesPerReg    int
	MaxOffsetMinutes  int
}

type Retention struct {
	NotificationPayload time.Duration
	AuditLog            time.Duration
	SystemEvent         time.Duration
	Interval            time.Duration
}

type Telegram struct {
	BotToken string
	BotName  string
	APIBase  string
	Timeout  time.Duration
}

type Email struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	FromName string
	Timeout  time.Duration
	StartTLS bool
}

type Ops struct {
	MetricsToken       string
	PageSizeMax        int
	PageSizeDef        int
	UserSearchPageSize int
}

func Load() (*Config, error) {
	tzID := env("SYSTEM_TIMEZONE", "Europe/Moscow")
	loc, err := time.LoadLocation(tzID)
	if err != nil {
		return nil, fmt.Errorf("system timezone %q: %w", tzID, err)
	}

	cfg := &Config{
		App: App{
			Env:        env("APP_ENV", "dev"),
			LogLevel:   env("LOG_LEVEL", "info"),
			LogFormat:  env("LOG_FORMAT", "pretty"),
			LogColor:   env("LOG_COLOR", "auto"),
			SystemTZ:   loc,
			SystemTZID: tzID,
			PublicURL:  strings.TrimRight(env("PUBLIC_URL", "http://localhost:5173"), "/"),
		},
		HTTP: HTTP{
			Addr:            env("HTTP_ADDR", ":8080"),
			ReadTimeout:     envDuration("HTTP_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:    envDuration("HTTP_WRITE_TIMEOUT", 30*time.Second),
			IdleTimeout:     envDuration("HTTP_IDLE_TIMEOUT", 60*time.Second),
			ShutdownTimeout: envDuration("HTTP_SHUTDOWN_TIMEOUT", 20*time.Second),
			CORSOrigins:     envList("CORS_ALLOWED_ORIGINS", []string{"http://localhost:5173"}),
			CookieDomain:    env("COOKIE_DOMAIN", ""),
			CookieSecure:    envBool("COOKIE_SECURE", false),
			SwaggerEnabled:  envBool("SWAGGER_ENABLED", true),
		},
		DB: DB{
			DSN:             env("DATABASE_URL", "postgres://event:event@localhost:5432/event?sslmode=disable"),
			MaxConns:        int32(envInt("DATABASE_MAX_CONNS", 10)),
			MinConns:        int32(envInt("DATABASE_MIN_CONNS", 2)),
			MaxConnLifetime: envDuration("DATABASE_CONN_LIFETIME", time.Hour),
			AppRole:         env("DATABASE_APP_ROLE", ""),
		},
		Auth: Auth{
			JWTSecret:          env("JWT_SECRET", "dev-insecure-secret-change-me"),
			AccessTTL:          envDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
			RefreshTTL:         envDuration("REFRESH_TOKEN_TTL", 30*24*time.Hour),
			EmailVerifyTTL:     envDuration("EMAIL_VERIFICATION_TTL", 24*time.Hour),
			PasswordResetTTL:   envDuration("PASSWORD_RESET_TTL", 30*time.Minute),
			InviteTTL:          envDuration("INVITE_TTL", 72*time.Hour),
			TeamJoinLinkTTL:    envDuration("TEAM_JOIN_LINK_TTL", 14*24*time.Hour),
			TelegramLinkTTL:    envDuration("TELEGRAM_LINK_TTL", time.Hour),
			MinPasswordLength:  envInt("PASSWORD_MIN_LENGTH", 10),
			FirstAdminEmail:    env("FIRST_ADMIN_EMAIL", ""),
			FirstAdminPassword: env("FIRST_ADMIN_PASSWORD", ""),
			FirstAdminName:     env("FIRST_ADMIN_NAME", "Administrator"),
		},
		Argon: Argon{
			Memory:      uint32(envInt("ARGON2_MEMORY_KIB", 65536)),
			Iterations:  uint32(envInt("ARGON2_ITERATIONS", 3)),
			Parallelism: uint8(envInt("ARGON2_PARALLELISM", 2)),
			SaltLength:  uint32(envInt("ARGON2_SALT_LENGTH", 16)),
			KeyLength:   uint32(envInt("ARGON2_KEY_LENGTH", 32)),
		},
		RateLim: loadRateLim(),
		Notify: Notify{
			SchedulerInterval: envDuration("SCHEDULER_INTERVAL", 5*time.Minute),
			SchedulerBatch:    envInt("SCHEDULER_BATCH_SIZE", 500),
			WorkerInterval:    envDuration("WORKER_POLL_INTERVAL", 5*time.Second),
			WorkerBatch:       envInt("WORKER_BATCH_SIZE", 20),
			LeaseTTL:          envDuration("WORKER_LEASE_TTL", 2*time.Minute),
			RecoveryInterval:  envDuration("WORKER_RECOVERY_INTERVAL", time.Minute),
			MaxProviderCalls:  envInt("NOTIFICATION_MAX_PROVIDER_CALLS", 4),
			Backoff:           envDurationList("NOTIFICATION_BACKOFF", []time.Duration{time.Minute, 5 * time.Minute, 30 * time.Minute}),
			MaxRulesPerReg:    envInt("NOTIFICATION_MAX_RULES", 10),
			MaxOffsetMinutes:  envInt("NOTIFICATION_MAX_OFFSET_MINUTES", 525600),
		},
		Retent: Retention{
			NotificationPayload: envDuration("RETENTION_NOTIFICATION_PAYLOAD", 90*24*time.Hour),
			AuditLog:            envDuration("RETENTION_AUDIT_LOG", 365*24*time.Hour),
			SystemEvent:         envDuration("RETENTION_SYSTEM_EVENT", 90*24*time.Hour),
			Interval:            envDuration("RETENTION_INTERVAL", 24*time.Hour),
		},
		Telegram: Telegram{
			BotToken: env("TELEGRAM_BOT_TOKEN", ""),
			BotName:  env("TELEGRAM_BOT_NAME", "timeline_bot"),
			APIBase:  env("TELEGRAM_API_BASE", "https://api.telegram.org"),
			Timeout:  envDuration("TELEGRAM_TIMEOUT", 10*time.Second),
		},
		Email: Email{
			Host:     env("SMTP_HOST", ""),
			Port:     envInt("SMTP_PORT", 587),
			Username: env("SMTP_USERNAME", ""),
			Password: env("SMTP_PASSWORD", ""),
			From:     env("EMAIL_FROM", "no-reply@event.local"),
			FromName: env("EMAIL_FROM_NAME", "Timeline"),
			Timeout:  envDuration("SMTP_TIMEOUT", 15*time.Second),
			StartTLS: envBool("SMTP_STARTTLS", true),
		},
		Ops: Ops{
			MetricsToken:       env("METRICS_TOKEN", ""),
			PageSizeMax:        envInt("PAGE_SIZE_MAX", 200),
			PageSizeDef:        envInt("PAGE_SIZE_DEFAULT", 50),
			UserSearchPageSize: envInt("USER_SEARCH_PAGE_SIZE", 50),
		},
		Personal: loadPersonal(),
		Digest:   loadDigest(),
		Links:    loadResourceLinks(),
		Avatar:   loadAvatar(),
		Realtime: loadRealtime(),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

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
	return c.Avatar.validate()
}
