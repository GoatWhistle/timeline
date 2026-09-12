package cli

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/spf13/cobra"
	httpSwagger "github.com/swaggo/http-swagger/v2"

	_ "github.com/GoatWhistle/timeline/docs"
	"github.com/GoatWhistle/timeline/internal/controllers"
)

func init() {
	commandBuilders = append(commandBuilders, newServeCmd)
}

func newServeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Run the HTTP API",
		Long: "Serves the HTTP API on HTTP_ADDR. Background notification delivery runs in " +
			"a separate worker command.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return serve(cmd.Context())
		},
	}
}

func serve(ctx context.Context) error {
	c, err := newContainer(ctx)
	if err != nil {
		return err
	}
	defer c.Close()

	srv := &http.Server{
		Addr:         c.cfg.HTTP.Addr,
		Handler:      newRouter(c),
		ReadTimeout:  c.cfg.HTTP.ReadTimeout,
		WriteTimeout: c.cfg.HTTP.WriteTimeout,
		IdleTimeout:  c.cfg.HTTP.IdleTimeout,
	}

	if c.cfg.Realtime.Enabled {
		go c.hub.Start(ctx)
	}

	errc := make(chan error, 1)
	go func() {
		slog.InfoContext(ctx, "api started", "addr", srv.Addr, "swagger", c.cfg.HTTP.SwaggerEnabled)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errc <- err
		}
	}()

	select {
	case err := <-errc:
		return err
	case <-ctx.Done():
	}

	slog.Info("api shutting down", "timeout", c.cfg.HTTP.ShutdownTimeout)
	shutdownCtx, cancel := context.WithTimeout(context.Background(), c.cfg.HTTP.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	slog.Info("api stopped")
	return nil
}

func applyRateLimits(deps *controllers.Deps, c *container) {
	deps.Limiter = c.limiter
	deps.CatalogRate = c.cfg.RateLim.CatalogRequests
	deps.CatalogRateWindow = c.cfg.RateLim.CatalogWindow
	deps.PublicRate = c.cfg.RateLim.PublicRequests
	deps.PublicRateWindow = c.cfg.RateLim.PublicWindow
	deps.SessionRate = c.cfg.RateLim.SessionRequests
	deps.SessionRateWindow = c.cfg.RateLim.SessionWindow
	deps.ProfileRate = c.cfg.RateLim.ProfileRequests
	deps.ProfileRateWindow = c.cfg.RateLim.ProfileWindow
	deps.PreviewRate = c.cfg.RateLim.PreviewRequests
	deps.PreviewRateWindow = c.cfg.RateLim.PreviewWindow
	deps.QueueRate = c.cfg.RateLim.QueueRequests
	deps.QueueRateWindow = c.cfg.RateLim.QueueWindow
	deps.PersonalRate = c.cfg.RateLim.PersonalRequests
	deps.PersonalRateWindow = c.cfg.RateLim.PersonalWindow
	deps.LinkRate = c.cfg.RateLim.LinkRequests
	deps.LinkRateWindow = c.cfg.RateLim.LinkWindow
	deps.FeedRate = c.cfg.RateLim.FeedRequests
	deps.FeedRateWindow = c.cfg.RateLim.FeedWindow
	deps.RealtimeRate = c.cfg.RateLim.RealtimeAttempts
	deps.RealtimeRateWindow = c.cfg.RateLim.RealtimeWindow
	deps.RealtimePing = c.cfg.Realtime.PingInterval
}

func newRouter(c *container) http.Handler {
	deps := controllers.Deps{
		Auth:           c.auth,
		Invites:        c.invites,
		Profile:        c.profile,
		Avatars:        c.avatars,
		Covers:         c.covers,
		ProfileLinks:   c.profileLinks,
		PublicProfiles: c.profile,
		Users:          c.users,
		Events:         c.events,
		Catalog:        c.catalog,
		Stages:         c.stages,
		Tracks:         c.tracks,
		Finance:        c.finance,
		Cases:          c.cases,
		Participants:   c.participants,
		Registrations:  c.registrations,
		Statuses:       c.statuses,
		Rules:          c.rules,
		Queries:        c.queries,
		Audit:          c.audit,
		Ops:            c.ops,
		Previews:       c.scheduler,
		Personal:       c.personal,
		Links:          c.links,
		Retention:      c.retention,
		Feed:           c.feed,
		Teams:          c.teams,

		Authenticator:         c.auth,
		Metrics:               promhttp.Handler(),
		TelegramWebhookSecret: c.cfg.Telegram.WebhookSecret,
		TelegramBot:           c.telegramBot,

		Cookies:        controllers.CookieOptions{Domain: c.cfg.HTTP.CookieDomain, Secure: c.cfg.HTTP.CookieSecure},
		PublicURL:      c.cfg.App.PublicURL,
		CORSOrigins:    c.cfg.HTTP.CORSOrigins,
		MetricsToken:   c.cfg.Ops.MetricsToken,
		PageDefault:    c.cfg.Ops.PageSizeDef,
		PageMax:        c.cfg.Ops.PageSizeMax,
		UserPageSize:   c.cfg.Ops.UserSearchPageSize,
		CSRFTTL:        c.cfg.Auth.RefreshTTL,
		AvatarMaxBytes: c.cfg.Avatar.MaxBytes,
		CoverMaxBytes:  c.cfg.Cover.MaxBytes,
	}
	applyRateLimits(&deps, c)
	if c.cfg.Realtime.Enabled {
		deps.Realtime = c.hub
		deps.Sessions = c.auth
	}
	if c.cfg.HTTP.SwaggerEnabled {
		deps.SwaggerUI = httpSwagger.WrapHandler
	}
	return controllers.NewRouter(deps)
}

func nowUTC() time.Time { return time.Now().UTC() }
