// Package repositories содержит доступ к PostgreSQL: пул соединений, управление
// транзакциями и запросы по таблицам. Бизнес-правила в этом слое отсутствуют.
package repositories

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kaifarikman/hackathon-os-backend/internal/config"
	"github.com/kaifarikman/hackathon-os-backend/internal/models"
)

// Querier — общий интерфейс пула и транзакции.
type Querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type txKey struct{}

// DB — пул соединений и менеджер транзакций.
type DB struct {
	pool *pgxpool.Pool
}

// Connect открывает пул соединений с PostgreSQL.
func Connect(ctx context.Context, cfg config.DB) (*DB, error) {
	poolCfg, err := pgxpool.ParseConfig(cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("разбор DSN: %w", err)
	}
	poolCfg.MaxConns = cfg.MaxConns
	poolCfg.MinConns = cfg.MinConns
	poolCfg.MaxConnLifetime = cfg.MaxConnLifetime

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("создание пула: %w", err)
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("проверка соединения: %w", err)
	}
	return &DB{pool: pool}, nil
}

// NewDB оборачивает готовый пул; используется в тестах.
func NewDB(pool *pgxpool.Pool) *DB { return &DB{pool: pool} }

// Close закрывает пул соединений.
func (d *DB) Close() { d.pool.Close() }

// Pool возвращает пул соединений.
func (d *DB) Pool() *pgxpool.Pool { return d.pool }

// Ping проверяет доступность базы данных.
func (d *DB) Ping(ctx context.Context) error { return d.pool.Ping(ctx) }

// Q возвращает исполнителя запросов: транзакцию из контекста либо пул.
func (d *DB) Q(ctx context.Context) Querier {
	if tx, ok := ctx.Value(txKey{}).(pgx.Tx); ok {
		return tx
	}
	return d.pool
}

// WithTx выполняет функцию в транзакции. Вложенный вызов переиспользует текущую
// транзакцию, поэтому сервисы могут свободно вызывать друг друга.
func (d *DB) WithTx(ctx context.Context, fn func(context.Context) error) error {
	if _, ok := ctx.Value(txKey{}).(pgx.Tx); ok {
		return fn(ctx)
	}
	tx, err := d.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("начало транзакции: %w", err)
	}
	txCtx := context.WithValue(ctx, txKey{}, tx)
	if err := fn(txCtx); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) {
			return errors.Join(err, fmt.Errorf("откат транзакции: %w", rbErr))
		}
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("фиксация транзакции: %w", err)
	}
	return nil
}

// InTx сообщает, выполняется ли контекст внутри транзакции.
func InTx(ctx context.Context) bool {
	_, ok := ctx.Value(txKey{}).(pgx.Tx)
	return ok
}

// Коды ошибок PostgreSQL, которые слой репозиториев переводит в доменные ошибки.
const (
	codeUniqueViolation     = "23505"
	codeForeignKeyViolation = "23503"
	codeCheckViolation      = "23514"
	codeRestrictViolation   = "23001"
	codeExclusionViolation  = "23P01"
)

// mapError переводит ошибку драйвера в доменную ошибку.
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

// constraintMessage подбирает понятное сообщение для нарушенного ограничения.
func constraintMessage(name string) string {
	if msg, ok := constraintMessages[name]; ok {
		return msg
	}
	if name == "" {
		return "нарушено ограничение целостности данных"
	}
	return "нарушено ограничение целостности данных: " + name
}

var constraintMessages = map[string]string{
	"users_email_key":                         "пользователь с таким email уже существует",
	"users_pending_email_key":                 "этот email уже ожидает подтверждения",
	"users_telegram_chat_id_key":              "этот аккаунт Telegram уже привязан",
	"invites_one_pending_per_email_key":       "на этот адрес уже есть действующее приглашение",
	"participants_hackathon_user_key":         "участник уже добавлен на хакатон",
	"registrations_hackathon_key":             "у хакатона уже есть регистрация",
	"registrations_deadline_within_hackathon": "дедлайн регистрации должен быть не позже окончания хакатона",
	"registrations_hackathon_end_fk":          "дедлайн регистрации должен быть не позже окончания хакатона",
	"statuses_registration_participant_key":   "статус регистрации участника уже существует",
	"statuses_registration_fk":                "регистрация и участник должны относиться к одному хакатону",
	"statuses_participant_fk":                 "регистрация и участник должны относиться к одному хакатону",
	"rules_registration_offset_key":           "правило с таким смещением уже существует",
	"rules_registration_slot_key":             "слот правила уже занят",
	"rules_slot_range":                        "на регистрацию допускается не более 10 правил",
	"rules_offset_range":                      "смещение должно быть в диапазоне ±525600 минут",
	"notifications_logical_key_key":           "уведомление для этой ситуации уже создано",
	"hackathons_period":                       "окончание хакатона должно быть позже начала",
	"stages_period":                           "окончание этапа должно быть позже начала",
	"hackathons_website_https":                "ссылка должна начинаться с https://",
	"registrations_url_https":                 "ссылка должна начинаться с https://",
	"stages_url_https":                        "ссылка должна начинаться с https://",
	"notifications_attempt_count_range":       "исчерпан лимит попыток доставки",
	"statuses_registered_at_only_done":        "дата регистрации допустима только для статуса DONE",
	"participants_removed_consistency":        "состояние участия не согласовано с датой удаления",
}
