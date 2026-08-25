// Package cli собирает команды приложения. Единая точка входа запускает API,
// фоновый worker, миграции и операционные процедуры.
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

// Version — версия сборки, подставляется линкером.
var Version = "0.8.0-dev"

// Execute запускает корневую команду и возвращает код завершения процесса.
func Execute() int {
	if err := newRootCmd().ExecuteContext(signalContext()); err != nil {
		fmt.Fprintln(os.Stderr, "ошибка:", err)
		return 1
	}
	return 0
}

func newRootCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:           "hackathon",
		Short:         "Backend системы Hackathon Tracker",
		Long:          "Backend системы Hackathon Tracker: API, фоновый worker, миграции и операционные процедуры.",
		SilenceUsage:  true,
		SilenceErrors: true,
		Version:       Version,
	}
	registerCommands(cmd)
	return cmd
}

// registerCommands подключает команды приложения к корневой команде.
func registerCommands(root *cobra.Command) {
	for _, add := range commandBuilders {
		root.AddCommand(add())
	}
}

// commandBuilders наполняется файлами команд через init.
var commandBuilders []func() *cobra.Command

// signalContext возвращает контекст, отменяемый по SIGINT и SIGTERM.
func signalContext() context.Context {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	go func() {
		<-ctx.Done()
		stop()
	}()
	return ctx
}

// loadConfig читает конфигурацию и настраивает журналирование.
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
	slog.SetDefault(slog.New(handler).With("service", "hackathon-tracker", "env", cfg.App.Env))
}
