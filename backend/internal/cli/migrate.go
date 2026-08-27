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
		Short: "Manage the database schema",
		Long:  "Apply and roll back schema migrations. The migration source is embedded in the binary.",
	}
	cmd.AddCommand(
		&cobra.Command{
			Use:   "up",
			Short: "Apply all pending migrations",
			RunE: func(cmd *cobra.Command, args []string) error {
				return withMigrator(func(m *migrate.Migrate) error {
					return report(m.Up())
				})
			},
		},
		&cobra.Command{
			Use:   "down",
			Short: "Roll back a single migration",
			RunE: func(cmd *cobra.Command, args []string) error {
				return withMigrator(func(m *migrate.Migrate) error {
					return report(m.Steps(-1))
				})
			},
		},
		&cobra.Command{
			Use:   "drop",
			Short: "Roll back all migrations",
			RunE: func(cmd *cobra.Command, args []string) error {
				return withMigrator(func(m *migrate.Migrate) error {
					return report(m.Down())
				})
			},
		},
		&cobra.Command{
			Use:   "version",
			Short: "Show the current schema version",
			RunE: func(cmd *cobra.Command, args []string) error {
				return withMigrator(func(m *migrate.Migrate) error {
					version, dirty, err := m.Version()
					if errors.Is(err, migrate.ErrNilVersion) {
						cmd.Println("schema is empty")
						return nil
					}
					if err != nil {
						return err
					}
					cmd.Printf("version %d, dirty=%t\n", version, dirty)
					return nil
				})
			},
		},
		&cobra.Command{
			Use:   "force <version>",
			Short: "Force the schema version after manual intervention",
			Args:  cobra.ExactArgs(1),
			RunE: func(cmd *cobra.Command, args []string) error {
				version, err := strconv.Atoi(args[0])
				if err != nil {
					return fmt.Errorf("version must be a number: %w", err)
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
		return fmt.Errorf("migration source: %w", err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", source, pgxURL(cfg.DB.DSN))
	if err != nil {
		return fmt.Errorf("initialising migrations: %w", err)
	}
	defer func() {
		if srcErr, dbErr := m.Close(); srcErr != nil || dbErr != nil {
			slog.Warn("closing migrations", "source_error", srcErr, "database_error", dbErr)
		}
	}()
	return fn(m)
}

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
		slog.Info("schema already up to date")
		return nil
	}
	if err != nil {
		return err
	}
	slog.Info("migrations applied")
	return nil
}
