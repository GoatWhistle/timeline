package cli

import (
	"context"
	"log/slog"
	"sync"

	"github.com/spf13/cobra"
)

func init() {
	commandBuilders = append(commandBuilders, newWorkerCmd)
}

func newWorkerCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "worker",
		Short: "Run the scheduler and the delivery worker",
		Long: "Runs two background loops: reconciling the notification queue against the rules " +
			"and delivering ready entries to Telegram and email.",
		RunE: func(cmd *cobra.Command, args []string) error {
			return worker(cmd.Context())
		},
	}
}

func worker(ctx context.Context) error {
	c, err := newContainer(ctx)
	if err != nil {
		return err
	}
	defer c.Close()

	slog.InfoContext(ctx, "worker started",
		"scheduler_interval", c.cfg.Notify.SchedulerInterval,
		"worker_interval", c.cfg.Notify.WorkerInterval,
		"smtp_host", c.cfg.Email.Host,
		"telegram_api_base", c.cfg.Telegram.APIBase)

	var wg sync.WaitGroup
	wg.Add(3)
	go func() {
		defer wg.Done()
		c.scheduler.Start(ctx)
	}()
	go func() {
		defer wg.Done()
		c.delivery.Start(ctx)
	}()
	go func() {
		defer wg.Done()
		c.reminders.Start(ctx, c.cfg.Notify.SchedulerInterval)
	}()
	wg.Wait()

	slog.Info("worker stopped")
	return nil
}
