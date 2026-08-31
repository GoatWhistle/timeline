package cli

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/observability/logger"
)

var Version = "0.8.0-dev"

func Execute() int {
	if err := newRootCmd().ExecuteContext(signalContext()); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		return 1
	}
	return 0
}

func newRootCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:           "timeline",
		Short:         "Timeline backend",
		Long:          "Timeline backend: API, background worker, migrations and operational procedures.",
		SilenceUsage:  true,
		SilenceErrors: true,
		Version:       Version,
	}
	registerCommands(cmd)
	return cmd
}

func registerCommands(root *cobra.Command) {
	for _, add := range commandBuilders {
		root.AddCommand(add())
	}
}

var commandBuilders []func() *cobra.Command

func signalContext() context.Context {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	go func() {
		<-ctx.Done()
		stop()
	}()
	return ctx
}

func loadConfig() (*config.Config, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	setupLogger(cfg)
	return cfg, nil
}

func setupLogger(cfg *config.Config) {
	base := logger.New(logger.Options{
		Level:  logger.ParseLevel(cfg.App.LogLevel),
		Format: cfg.App.LogFormat,
		Color:  cfg.App.LogColor,
	})
	slog.SetDefault(base.With("service", "event-tracker", "env", cfg.App.Env))
}
