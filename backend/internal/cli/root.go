package cli

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"

	"github.com/kaifarikman/hackathon-os-backend/internal/config"
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
		Use:           "event",
		Short:         "Hackathon Tracker backend",
		Long:          "Hackathon Tracker backend: API, background worker, migrations and operational procedures.",
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
	level := slog.LevelInfo
	switch cfg.App.LogLevel {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})
	slog.SetDefault(slog.New(handler).With("service", "event-tracker", "env", cfg.App.Env))
}
