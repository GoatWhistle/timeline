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

func newRouter(c *container) http.Handler {
	deps := controllers.Deps{
		Auth:          c.auth,
		Invites:       c.invites,
		Profile:       c.profile,
		Users:         c.users,
		Events:        c.events,
		Catalog:       c.catalog,
		Stages:        c.stages,
		Participants:  c.participants,
		Registrations: c.registrations,
		Statuses:      c.statuses,
		Rules:         c.rules,
		Queries:       c.queries,
		Audit:         c.audit,
		Ops:           c.ops,
		Previews:      c.scheduler,
		Personal:      c.personal,
		Links:         c.links,
		Feed:          c.feed,
		Notifications: c.notifier,

		Authenticator: c.auth,
		Metrics:       promhttp.Handler(),

		Limiter:            c.limiter,
		CatalogRate:        c.cfg.RateLim.CatalogRequests,
		CatalogRateWindow:  c.cfg.RateLim.CatalogWindow,
		SessionRate:        c.cfg.RateLim.SessionRequests,
		SessionRateWindow:  c.cfg.RateLim.SessionWindow,
		PreviewRate:        c.cfg.RateLim.PreviewRequests,
		PreviewRateWindow:  c.cfg.RateLim.PreviewWindow,
		QueueRate:          c.cfg.RateLim.QueueRequests,
		QueueRateWindow:    c.cfg.RateLim.QueueWindow,
		PersonalRate:       c.cfg.RateLim.PersonalRequests,
		PersonalRateWindow: c.cfg.RateLim.PersonalWindow,
		LinkRate:           c.cfg.RateLim.LinkRequests,
		LinkRateWindow:     c.cfg.RateLim.LinkWindow,
		FeedRate:           c.cfg.RateLim.FeedRequests,
		FeedRateWindow:     c.cfg.RateLim.FeedWindow,
		RealtimeRate:       c.cfg.RateLim.RealtimeAttempts,
		RealtimeRateWindow: c.cfg.RateLim.RealtimeWindow,
		RealtimePing:       c.cfg.Realtime.PingInterval,

		Cookies:      controllers.CookieOptions{Domain: c.cfg.HTTP.CookieDomain, Secure: c.cfg.HTTP.CookieSecure},
		PublicURL:    c.cfg.App.PublicURL,
		CORSOrigins:  c.cfg.HTTP.CORSOrigins,
		MetricsToken: c.cfg.Ops.MetricsToken,
		PageDefault:  c.cfg.Ops.PageSizeDef,
		PageMax:      c.cfg.Ops.PageSizeMax,
		UserPageSize: c.cfg.Ops.UserSearchPageSize,
		CSRFTTL:      c.cfg.Auth.RefreshTTL,
	}
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
