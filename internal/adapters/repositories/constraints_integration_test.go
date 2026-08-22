//go:build integration

package repositories_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kaifarikman/hackathon-os-backend/internal/testsupport"
)

// Тесты проверяют, что ограничения целостности разделов 8 и 15 ТЗ выражены
// в миграциях, а не только в коде приложения.

func TestDeadlineNotAfterHackathonEnd(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	hackathon := insertHackathon(t, pool, start, start.Add(48*time.Hour))

	// Дедлайн позже окончания хакатона запрещён локальным CHECK.
	_, err := pool.Exec(ctx, `
		INSERT INTO registrations (hackathon_id, url, deadline_at, hackathon_end_at)
		VALUES ($1, 'https://example.com/reg', $2, $3)`,
		hackathon, start.Add(72*time.Hour), start.Add(48*time.Hour))
	requireConstraint(t, err, "registrations_deadline_within_hackathon")

	// Корректная регистрация создаётся.
	if _, err := pool.Exec(ctx, `
		INSERT INTO registrations (hackathon_id, url, deadline_at, hackathon_end_at)
		VALUES ($1, 'https://example.com/reg', $2, $3)`,
		hackathon, start.Add(24*time.Hour), start.Add(48*time.Hour)); err != nil {
		t.Fatalf("создание регистрации: %v", err)
	}

	// Сдвиг окончания хакатона раньше дедлайна отклоняется базой: копия
	// hackathon_end_at обновляется каскадом и нарушает CHECK.
	_, err = pool.Exec(ctx, `UPDATE hackathons SET end_at = $2 WHERE id = $1`,
		hackathon, start.Add(12*time.Hour))
	requireConstraint(t, err, "registrations_deadline_within_hackathon")

	// Сдвиг окончания вперёд каскадно обновляет денормализованную копию.
	if _, err := pool.Exec(ctx, `UPDATE hackathons SET end_at = $2 WHERE id = $1`,
		hackathon, start.Add(96*time.Hour)); err != nil {
		t.Fatalf("перенос окончания хакатона: %v", err)
	}
	var copied time.Time
	if err := pool.QueryRow(ctx, `SELECT hackathon_end_at FROM registrations WHERE hackathon_id = $1`, hackathon).
		Scan(&copied); err != nil {
		t.Fatalf("чтение копии окончания: %v", err)
	}
	if !copied.UTC().Equal(start.Add(96 * time.Hour)) {
		t.Fatalf("копия окончания не обновилась каскадом: %v", copied)
	}
}

// AC-REG-05: статус обязан связывать регистрацию и участника одного хакатона.
func TestStatusCrossHackathonIntegrity(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)

	first := insertHackathon(t, pool, start, start.Add(48*time.Hour))
	second := insertHackathon(t, pool, start, start.Add(48*time.Hour))
	user := insertUser(t, pool, "cross@example.com")

	registration := insertRegistration(t, pool, first, start.Add(24*time.Hour), start.Add(48*time.Hour))
	foreignParticipant := insertParticipant(t, pool, second, user)

	_, err := pool.Exec(ctx, `
		INSERT INTO registration_statuses (hackathon_id, registration_id, participant_id)
		VALUES ($1, $2, $3)`, first, registration, foreignParticipant)
	if err == nil {
		t.Fatal("статус связал регистрацию и участника разных хакатонов")
	}
	requireConstraint(t, err, "statuses_participant_fk")
}

func TestNotificationRuleSlotLimit(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	hackathon := insertHackathon(t, pool, start, start.Add(48*time.Hour))
	registration := insertRegistration(t, pool, hackathon, start.Add(24*time.Hour), start.Add(48*time.Hour))

	for slot := 1; slot <= 10; slot++ {
		if _, err := pool.Exec(ctx, `
			INSERT INTO notification_rules (registration_id, offset_minutes, slot_no)
			VALUES ($1, $2, $3)`, registration, slot*60, slot); err != nil {
			t.Fatalf("создание правила в слоте %d: %v", slot, err)
		}
	}

	// Одиннадцатое правило не помещается: слоты ограничены диапазоном 1..10.
	_, err := pool.Exec(ctx, `
		INSERT INTO notification_rules (registration_id, offset_minutes, slot_no)
		VALUES ($1, 999, 11)`, registration)
	requireConstraint(t, err, "rules_slot_range")

	// Повторное занятие слота отклоняется уникальным индексом.
	_, err = pool.Exec(ctx, `
		INSERT INTO notification_rules (registration_id, offset_minutes, slot_no)
		VALUES ($1, 12345, 3)`, registration)
	requireConstraint(t, err, "rules_registration_slot_key")

	// Повтор смещения тоже запрещён.
	_, err = pool.Exec(ctx, `
		INSERT INTO notification_rules (registration_id, offset_minutes, slot_no)
		VALUES ($1, 60, 3)`, registration)
	requireConstraint(t, err, "rules_registration_offset_key")

	// Смещение вне допустимого диапазона отклоняется.
	_, err = pool.Exec(ctx, `
		INSERT INTO notification_rules (registration_id, offset_minutes, slot_no)
		VALUES ($1, 600000, 5)`, registration)
	requireConstraint(t, err, "rules_offset_range")
}

// AC-NOTIF-01: конкурентные планировщики не создают два уведомления
// с одинаковым логическим ключом.
func TestNotificationLogicalKeyUnique(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	statusID, userID := seedStatus(t, pool)

	insert := `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			assignment_version, activation_version, notification_content_version,
			logical_key, requested_channel, scheduled_at, next_attempt_at)
		VALUES ('REGISTRATION_REQUIRED', $1, $2, 1, 1, 1, $3, 'EMAIL', now(), now())`

	key := "required:" + statusID + ":av1:rv1:cv1"
	if _, err := pool.Exec(ctx, insert, userID, statusID, key); err != nil {
		t.Fatalf("создание уведомления: %v", err)
	}
	_, err := pool.Exec(ctx, insert, userID, statusID, key)
	requireConstraint(t, err, "notifications_logical_key_key")

	// Идемпотентная вставка конкурентного планировщика не должна падать.
	tag, err := pool.Exec(ctx, insert+" ON CONFLICT (logical_key) DO NOTHING", userID, statusID, key)
	if err != nil {
		t.Fatalf("идемпотентная вставка: %v", err)
	}
	if tag.RowsAffected() != 0 {
		t.Fatalf("ожидалось 0 вставленных строк, получено %d", tag.RowsAffected())
	}
}

// Набор обязательных версий определяется типом уведомления (раздел 9.2 ТЗ).
func TestNotificationVersionsByType(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	statusID, userID := seedStatus(t, pool)

	// Первичному уведомлению нужны версии назначения и активации.
	_, err := pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			notification_content_version, logical_key, requested_channel, scheduled_at)
		VALUES ('REGISTRATION_REQUIRED', $1, $2, 1, 'required:no-versions', 'EMAIL', now())`,
		userID, statusID)
	requireConstraint(t, err, "notifications_versions_by_type")

	// Напоминанию нужны правило, версия расписания и цикл TODO.
	_, err = pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			notification_content_version, logical_key, requested_channel, scheduled_at)
		VALUES ('REGISTRATION_REMINDER', $1, $2, 1, 'reminder:no-rule', 'EMAIL', now())`,
		userID, statusID)
	requireConstraint(t, err, "notifications_versions_by_type")
}

// Строку уведомления удалять нельзя: logical_key остаётся гарантией дедупликации.
func TestNotificationRowsCannotBeDeleted(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	statusID, userID := seedStatus(t, pool)

	if _, err := pool.Exec(ctx, `
		INSERT INTO notifications (
			notification_type, recipient_user_id, registration_status_id,
			assignment_version, activation_version, notification_content_version,
			logical_key, requested_channel, scheduled_at, payload_json)
		VALUES ('REGISTRATION_REQUIRED', $1, $2, 1, 1, 1, 'required:retention', 'EMAIL', now(), '{"a":1}')`,
		userID, statusID); err != nil {
		t.Fatalf("создание уведомления: %v", err)
	}

	if _, err := pool.Exec(ctx, `DELETE FROM notifications WHERE logical_key = 'required:retention'`); err == nil {
		t.Fatal("удаление строки уведомления должно быть запрещено")
	}

	// AC-NOTIF-19: очистка по сроку хранения обнуляет только payload.
	if _, err := pool.Exec(ctx, `UPDATE notifications SET payload_json = NULL WHERE logical_key = 'required:retention'`); err != nil {
		t.Fatalf("очистка payload: %v", err)
	}
	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM notifications WHERE logical_key = 'required:retention'`).Scan(&count); err != nil {
		t.Fatalf("чтение уведомления: %v", err)
	}
	if count != 1 {
		t.Fatalf("строка уведомления должна сохраниться, найдено %d", count)
	}
}

// AC-AUDIT-01: запись аудита недоступна для изменения через runtime-подключение.
func TestAuditLogImmutable(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()

	if _, err := pool.Exec(ctx, `
		INSERT INTO audit_log (action, entity_type, after_json)
		VALUES ('STATUS_CHANGE', 'REGISTRATION_STATUS', '{"status":"DONE"}')`); err != nil {
		t.Fatalf("создание записи аудита: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE audit_log SET action = 'RULE_CHANGE'`); err == nil {
		t.Fatal("изменение записи аудита должно быть запрещено")
	}
	if _, err := pool.Exec(ctx, `DELETE FROM audit_log`); err == nil {
		t.Fatal("удаление записи аудита должно быть запрещено")
	}

	// Процедура хранения выполняет удаление с явно выставленным признаком.
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatalf("начало транзакции: %v", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SET LOCAL app.audit_retention = 'on'`); err != nil {
		t.Fatalf("включение режима хранения: %v", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM audit_log`); err != nil {
		t.Fatalf("очистка по сроку хранения: %v", err)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatalf("фиксация транзакции: %v", err)
	}
}

func TestParticipantUniquePerHackathon(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	hackathon := insertHackathon(t, pool, start, start.Add(48*time.Hour))
	user := insertUser(t, pool, "dup@example.com")

	insertParticipant(t, pool, hackathon, user)
	_, err := pool.Exec(ctx, `
		INSERT INTO hackathon_participants (hackathon_id, user_id, team_role)
		VALUES ($1, $2, 'Разработчик')`, hackathon, user)
	requireConstraint(t, err, "participants_hackathon_user_key")
}

func TestRegistrationUniquePerHackathon(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	start := time.Now().UTC().Truncate(time.Second)
	hackathon := insertHackathon(t, pool, start, start.Add(48*time.Hour))
	insertRegistration(t, pool, hackathon, start.Add(24*time.Hour), start.Add(48*time.Hour))

	_, err := pool.Exec(ctx, `
		INSERT INTO registrations (hackathon_id, url, deadline_at, hackathon_end_at)
		VALUES ($1, 'https://example.com/second', $2, $3)`,
		hackathon, start.Add(12*time.Hour), start.Add(48*time.Hour))
	requireConstraint(t, err, "registrations_hackathon_key")
}

func TestInviteSinglePendingPerEmail(t *testing.T) {
	pool := testsupport.Pool(t)
	ctx := context.Background()
	admin := insertUser(t, pool, "admin@example.com")

	insert := `
		INSERT INTO invites (normalized_email, created_by_user_id, token_hash, expires_at)
		VALUES ('invitee@example.com', $1, $2, now() + interval '72 hours')`
	if _, err := pool.Exec(ctx, insert, admin, "hash-1"); err != nil {
		t.Fatalf("создание приглашения: %v", err)
	}
	_, err := pool.Exec(ctx, insert, admin, "hash-2")
	requireConstraint(t, err, "invites_one_pending_per_email_key")

	// После отзыва предыдущего приглашения новое создаётся.
	if _, err := pool.Exec(ctx, `UPDATE invites SET revoked_at = now() WHERE token_hash = 'hash-1'`); err != nil {
		t.Fatalf("отзыв приглашения: %v", err)
	}
	if _, err := pool.Exec(ctx, insert, admin, "hash-2"); err != nil {
		t.Fatalf("повторное создание приглашения: %v", err)
	}
}

// --- вспомогательные функции ---

func requireConstraint(t *testing.T, err error, constraint string) {
	t.Helper()
	if err == nil {
		t.Fatalf("ожидалось нарушение ограничения %s, ошибки нет", constraint)
	}
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		t.Fatalf("ожидалась ошибка PostgreSQL, получено: %v", err)
	}
	if pgErr.ConstraintName != constraint {
		t.Fatalf("ожидалось ограничение %s, нарушено %s (%s)", constraint, pgErr.ConstraintName, pgErr.Message)
	}
}

func insertHackathon(t *testing.T, pool *pgxpool.Pool, start, end time.Time) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(), `
		INSERT INTO hackathons (title, start_at, end_at, published_at)
		VALUES ('Тестовый хакатон', $1, $2, now()) RETURNING id`, start, end).Scan(&id)
	if err != nil {
		t.Fatalf("создание хакатона: %v", err)
	}
	return id
}

func insertUser(t *testing.T, pool *pgxpool.Pool, email string) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(), `
		INSERT INTO users (display_name, email, password_hash, email_verified_at)
		VALUES ('Тестовый пользователь', $1, 'hash', now()) RETURNING id`, email).Scan(&id)
	if err != nil {
		t.Fatalf("создание пользователя: %v", err)
	}
	return id
}

func insertParticipant(t *testing.T, pool *pgxpool.Pool, hackathon, user string) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(), `
		INSERT INTO hackathon_participants (hackathon_id, user_id, team_role)
		VALUES ($1, $2, 'Разработчик') RETURNING id`, hackathon, user).Scan(&id)
	if err != nil {
		t.Fatalf("создание участника: %v", err)
	}
	return id
}

func insertRegistration(t *testing.T, pool *pgxpool.Pool, hackathon string, deadline, end time.Time) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(), `
		INSERT INTO registrations (hackathon_id, url, deadline_at, hackathon_end_at)
		VALUES ($1, 'https://example.com/reg', $2, $3) RETURNING id`, hackathon, deadline, end).Scan(&id)
	if err != nil {
		t.Fatalf("создание регистрации: %v", err)
	}
	return id
}

func seedStatus(t *testing.T, pool *pgxpool.Pool) (statusID, userID string) {
	t.Helper()
	start := time.Now().UTC().Truncate(time.Second)
	hackathon := insertHackathon(t, pool, start, start.Add(48*time.Hour))
	userID = insertUser(t, pool, "member@example.com")
	participant := insertParticipant(t, pool, hackathon, userID)
	registration := insertRegistration(t, pool, hackathon, start.Add(24*time.Hour), start.Add(48*time.Hour))

	err := pool.QueryRow(context.Background(), `
		INSERT INTO registration_statuses (hackathon_id, registration_id, participant_id)
		VALUES ($1, $2, $3) RETURNING id`, hackathon, registration, participant).Scan(&statusID)
	if err != nil {
		t.Fatalf("создание статуса: %v", err)
	}
	return statusID, userID
}
