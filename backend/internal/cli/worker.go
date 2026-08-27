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
		"telegram_driver", c.cfg.Telegram.Driver,
		"email_driver", c.cfg.Email.Driver)

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		c.scheduler.Start(ctx)
	}()
	go func() {
		defer wg.Done()
		c.delivery.Start(ctx)
	}()
	wg.Wait()

	slog.Info("worker stopped")
	return nil
}
