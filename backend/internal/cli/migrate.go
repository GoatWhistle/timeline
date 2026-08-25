package cli

import (
	"errors"
	"fmt"
	"log/slog"
	"strconv"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/spf13/cobra"

	"github.com/kaifarikman/hackathon-os-backend/migrations"
)

func init() {
	commandBuilders = append(commandBuilders, newMigrateCmd)
}

func newMigrateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "migrate",
		Short: "Управление схемой базы данных",
		Long:  "Применение и откат миграций схемы. Источник миграций встроен в бинарь.",
	}
	cmd.AddCommand(
		&cobra.Command{
			Use:   "up",
			Short: "Применить все неприменённые миграции",
			RunE: func(cmd *cobra.Command, args []string) error {
				return withMigrator(func(m *migrate.Migrate) error {
					return report(m.Up())
				})
			},
		},
		&cobra.Command{
			Use:   "down",
			Short: "Откатить одну миграцию",
			RunE: func(cmd *cobra.Command, args []string) error {
				return withMigrator(func(m *migrate.Migrate) error {
					return report(m.Steps(-1))
				})
			},
		},
		&cobra.Command{
			Use:   "drop",
			Short: "Откатить все миграции",
			RunE: func(cmd *cobra.Command, args []string) error {
				return withMigrator(func(m *migrate.Migrate) error {
					return report(m.Down())
				})
			},
		},
		&cobra.Command{
			Use:   "version",
			Short: "Показать текущую версию схемы",
			RunE: func(cmd *cobra.Command, args []string) error {
				return withMigrator(func(m *migrate.Migrate) error {
					version, dirty, err := m.Version()
					if errors.Is(err, migrate.ErrNilVersion) {
						cmd.Println("схема пуста")
						return nil
					}
					if err != nil {
						return err
					}
					cmd.Printf("версия %d, dirty=%t\n", version, dirty)
					return nil
				})
			},
		},
		&cobra.Command{
			Use:   "force <version>",
			Short: "Принудительно выставить версию схемы после ручного вмешательства",
			Args:  cobra.ExactArgs(1),
			RunE: func(cmd *cobra.Command, args []string) error {
				version, err := strconv.Atoi(args[0])
				if err != nil {
					return fmt.Errorf("версия должна быть числом: %w", err)
				}
				return withMigrator(func(m *migrate.Migrate) error {
					return m.Force(version)
				})
			},
		},
	)
	return cmd
}

func withMigrator(fn func(*migrate.Migrate) error) error {
	cfg, err := loadConfig()
	if err != nil {
		return err
	}
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("источник миграций: %w", err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", source, pgxURL(cfg.DB.DSN))
	if err != nil {
		return fmt.Errorf("инициализация миграций: %w", err)
	}
	defer func() {
		if srcErr, dbErr := m.Close(); srcErr != nil || dbErr != nil {
			slog.Warn("закрытие миграций", "source_error", srcErr, "database_error", dbErr)
		}
	}()
	return fn(m)
}

// pgxURL приводит DSN к схеме, которую ожидает драйвер golang-migrate.
func pgxURL(dsn string) string {
	switch {
	case len(dsn) > 13 && dsn[:13] == "postgresql://":
		return "pgx5://" + dsn[13:]
	case len(dsn) > 11 && dsn[:11] == "postgres://":
		return "pgx5://" + dsn[11:]
	default:
		return dsn
	}
}

func report(err error) error {
	if errors.Is(err, migrate.ErrNoChange) {
		slog.Info("схема уже актуальна")
		return nil
	}
	if err != nil {
		return err
	}
	slog.Info("миграции применены")
	return nil
}
