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
		Short: "Запустить планировщик и worker доставки",
		Long: "Ведёт два фоновых цикла: согласование очереди уведомлений по правилам " +
			"и доставку готовых записей в Telegram и email.",
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

	slog.InfoContext(ctx, "worker запущен",
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

	slog.Info("worker остановлен")
	return nil
}
