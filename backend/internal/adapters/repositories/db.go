package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/GoatWhistle/timeline/internal/config"
	"github.com/GoatWhistle/timeline/internal/models"
)

type Querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type txKey struct{}

type DB struct {
	pool *pgxpool.Pool
}

func Connect(ctx context.Context, cfg config.DB) (*DB, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("parsing DSN: %w", err)
	}
	poolCfg.MaxConns = cfg.MaxConns
	poolCfg.MinConns = cfg.MinConns
	poolCfg.MaxConnLifetime = cfg.MaxConnLifetime

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("creating pool: %w", err)
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("checking connection: %w", err)
	}
	return &DB{pool: pool}, nil
}

func NewDB(pool *pgxpool.Pool) *DB { return &DB{pool: pool} }

func (d *DB) Close() { d.pool.Close() }

func (d *DB) Pool() *pgxpool.Pool { return d.pool }

func (d *DB) Ping(ctx context.Context) error { return d.pool.Ping(ctx) }

func (d *DB) Q(ctx context.Context) Querier {
	if tx, ok := ctx.Value(txKey{}).(pgx.Tx); ok {
		return tx
	}
	return d.pool
}

func (d *DB) WithTx(ctx context.Context, fn func(context.Context) error) error {
	if _, ok := ctx.Value(txKey{}).(pgx.Tx); ok {
		return fn(ctx)
	}
	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}
	txCtx := context.WithValue(ctx, txKey{}, tx)
	if err := fn(txCtx); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) {
			return errors.Join(err, fmt.Errorf("rolling back transaction: %w", rbErr))
		}
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}
	return nil
}

func InTx(ctx context.Context) bool {
	_, ok := ctx.Value(txKey{}).(pgx.Tx)
	return ok
}

const (
	codeUniqueViolation     = "23505"
	codeForeignKeyViolation = "23503"
	codeCheckViolation      = "23514"
	codeRestrictViolation   = "23001"
	codeExclusionViolation  = "23P01"
)

func mapError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case codeUniqueViolation, codeExclusionViolation:
			return models.NewConflict("unique_violation", constraintMessage(pgErr.ConstraintName))
		case codeForeignKeyViolation:
			return models.NewConflict("foreign_key_violation", constraintMessage(pgErr.ConstraintName))
		case codeCheckViolation:
			return models.NewValidation(constraintMessage(pgErr.ConstraintName))
		case codeRestrictViolation:
			return models.NewConflict("restrict_violation", pgErr.Message)
		}
	}
	return err
}

func constraintMessage(name string) string {
	if msg, ok := constraintMessages[name]; ok {
		return msg
	}
	if name == "" {
		return "data integrity constraint violated"
	}
	return "data integrity constraint violated: " + name
}

var constraintMessages = map[string]string{
	"users_email_key":                       "a user with this email already exists",
	"users_pending_email_key":               "this email is already awaiting confirmation",
	"users_telegram_chat_id_key":            "this Telegram account is already linked",
	"invites_one_pending_per_email_key":     "an active invite already exists for this address",
	"participants_event_user_key":           "the participant is already added to the event",
	"registrations_event_key":               "the event already has a registration",
	"registrations_deadline_within_event":   "the registration deadline must not be later than the event end",
	"registrations_event_end_fk":            "the registration deadline must not be later than the event end",
	"statuses_registration_participant_key": "a registration status for this participant already exists",
	"statuses_registration_fk":              "the registration and the participant must belong to the same event",
	"statuses_participant_fk":               "the registration and the participant must belong to the same event",
	"rules_registration_offset_key":         "a rule with this offset already exists",
	"rules_registration_slot_key":           "the rule slot is already taken",
	"rules_slot_range":                      "a registration accepts at most 10 rules",
	"rules_offset_range":                    "the offset must be within +/-525600 minutes",
	"notifications_logical_key_key":         "a notification for this situation already exists",
	"events_period":                         "event end must be later than its start",
	"stages_period":                         "stage end must be later than its start",
	"events_website_https":                  "the link must start with https://",
	"registrations_url_https":               "the link must start with https://",
	"stages_url_https":                      "the link must start with https://",
	"notifications_attempt_count_range":     "the delivery attempt limit is exhausted",
	"statuses_registered_at_only_done":      "the registration date is allowed only for the DONE status",
	"participants_removed_consistency":      "participation state is inconsistent with the removal date",
}
